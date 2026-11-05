#!/usr/bin/env python3
"""MP4 の長さ・大きさ・音声の有無・付属情報（メタデータ）を表示する。ffmpeg が無くても動く。

使い方: python3 -I .claude/skills/making-page/inspect_video.py 動画.mp4 [動画2.mp4 ...]
「付属情報あり」と出たら、`avconvert` で作り直す（SKILL.md の手順）。
"""
import os
import struct
import sys

CONTAINERS = {b"moov", b"trak", b"mdia", b"minf", b"stbl", b"udta", b"edts"}
# 撮影場所・編集ソフト・題名などが入りうる箱
META_BOXES = {b"udta", b"meta", b"\xa9xyz", b"loci", b"\xa9too", b"\xa9nam", b"\xa9ART", b"\xa9cmt", b"\xa9day", b"\xa9mak", b"\xa9mod", b"\xa9swr", b"ilst"}


def walk(data, start, end, found, depth=0):
    pos = start
    while pos + 8 <= end:
        size, kind = struct.unpack(">I4s", data[pos : pos + 8])
        header = 8
        if size == 1:
            size = struct.unpack(">Q", data[pos + 8 : pos + 16])[0]
            header = 16
        elif size == 0:
            size = end - pos
        if size < header:
            break
        body = pos + header
        found.setdefault(kind, []).append((data, body, pos + size))
        if kind in META_BOXES:
            found.setdefault(b"__meta__", []).append(kind)
        if kind in CONTAINERS:
            walk(data, body, pos + size, found, depth + 1)
        pos += size


def inspect(path):
    data = open(path, "rb").read()
    found = {}
    walk(data, 0, len(data), found)
    size_mb = os.path.getsize(path) / 1024 / 1024

    duration = "不明"
    if b"mvhd" in found:
        d, b, _ = found[b"mvhd"][0]
        version = d[b]
        if version == 1:
            timescale, dur = struct.unpack(">IQ", d[b + 20 : b + 32])
        else:
            timescale, dur = struct.unpack(">II", d[b + 12 : b + 20])
        duration = "%.1f秒" % (dur / timescale)

    kinds = []
    for d, b, _ in found.get(b"hdlr", []):
        kinds.append(d[b + 8 : b + 12])
    has_audio = b"soun" in kinds
    has_video = b"vide" in kinds

    dims = "不明"
    for d, b, _ in found.get(b"tkhd", []):
        version = d[b]
        off = b + (88 if version == 1 else 76)
        w, h = struct.unpack(">II", d[off : off + 8])
        if w >> 16 and h >> 16:
            dims = "%dx%d" % (w >> 16, h >> 16)

    meta = sorted(set(k.decode("latin-1") for k in found.get(b"__meta__", [])))
    print(path)
    print("  サイズ: %.1fMB / 長さ: %s / 画面: %s" % (size_mb, duration, dims))
    print("  映像: %s / 音声: %s" % ("あり" if has_video else "なし", "あり" if has_audio else "なし"))
    print("  付属情報: %s" % ("あり（" + ", ".join(meta) + "）" if meta else "なし"))
    # 変換ソフトの名前が、映像データの中に書き込まれていることがある（個人情報ではないが、無いほうがよい）
    tools = [t.decode() for t in (b"x264", b"Lavf", b"Lavc", b"HandBrake") if t in data]
    print("  変換ソフトの記録: %s" % ("あり（" + ", ".join(tools) + "）" if tools else "なし"))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    for p in sys.argv[1:]:
        inspect(p)
