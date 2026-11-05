---
name: develop-pv
description: Develop ページの作品に、プロモーションビデオ（PV）を付ける手順。「Develop の〇〇に PV を載せて」「新しいアプリを Develop に足して（PV 付き）」と言われたときに使う。
---

# Develop の作品に PV を付ける

Develop に載せる**今後の作品には、基本すべて PV を付ける**（本人の方針）。ただし、個人 HP である「叶奏の備忘録」自身には付けない。

仕組み（見た目・登場演出・動画の操作バー）は `style.css` と `script.js` に入っている。**HTML に `<div class="dev-pv">` を足すだけ**で動く。CSS・JS は触らない。

最初に、リポジトリ直下の `CLAUDE.md`（「プライバシールール」「コード規約」の Develop の項目）を読むこと。動画の下ごしらえ（変換・確認・表紙画像）の細かい手順は、`.claude/skills/making-page/SKILL.md` の「3. 動画の下ごしらえ」と同じ。

## 0. 本人に聞くこと

- 作品名・説明・使用技術・役割（チームで開発したものだけ）・公開ページの URL・GitHub のリポジトリ（公開しているものだけ）
- PV のファイルの場所（リポジトリの外）。音声が入っているか
- 載せてはいけないもの（本名・住所・他人の顔・位置情報。二次創作の作品そのものの映像・画像は載せない）

## 1. PV の下ごしらえ

| 項目 | 決まり |
| --- | --- |
| 置き場所 | `videos/dev/作品のid-pv.mp4` |
| 表紙の画像 | `images/dev/作品のid-pv.webp`（`poster` に使う。再生前に見える） |
| 縦横比 | 16:9 が基本（枠は 16:9 で、はみ出さずに収まる） |
| 大きさ | 720p 目安（`Preset1280x720`）。音声あり可。**1本20MB以下** |
| 付属情報 | 消す（撮影・編集ソフトの情報、位置情報、作者名） |
| 埋め込み | YouTube などは使わない。`<video>` を直接置く |

```sh
avconvert --preset Preset1280x720 --source 元の動画.mov --output videos/dev/作品のid-pv.mp4 --replace
python3 -I .claude/skills/making-page/inspect_video.py videos/dev/作品のid-pv.mp4   # 長さ・音声・付属情報・画面の大きさ
qlmanage -t -s 1280 -o /tmp/ videos/dev/作品のid-pv.mp4                               # 表紙の元になるコマ（/tmp/作品のid-pv.mp4.png）
magick /tmp/作品のid-pv.mp4.png -strip -quality 80 images/dev/作品のid-pv.webp          # 500KB以下を目安
```

元の動画は、リポジトリの外に置く。一度コミットした動画は履歴に残るので、差し替えを何度も繰り返さない。表紙は、動画のどこかの場面を本人に選んでもらってもよい（その場合は、`--start 秒数` 付きで切り出す）。

## 2. dev/index.html に書く

`<article class="dev-item">` の**先頭**に、`.dev-pv` を足す。残りの `.dev-shot`・`.dev-text` は、これまでどおり。

```html
<article class="dev-item">
  <div class="dev-pv">
    <video src="../videos/dev/作品のid-pv.mp4" poster="../images/dev/作品のid-pv.webp" width="1280" height="720" preload="none" playsinline controls aria-label="作品名のプロモーションビデオ"></video>
  </div>
  <div class="dev-shot"> … </div>
  <div class="dev-text"> … </div>
</article>
```

- 動画に音声が無いときは、`muted` を付ける（消音ボタンが出なくなる）。
- 再生は押したときだけ（`preload="none"`、`autoplay` は付けない）。
- `controls` を付けておくと、`script.js` の `initPlayers` が自前の操作バー（再生・停止、再生位置、時間、消音）に替える。JS が無いときは、標準の操作で再生できる。
- PV の最大幅は `style.css` の `.dev-pv` の `--pv-w`（今は 640px）。スマホでは、PV → スクリーンショット → 説明の順に縦に並ぶ。
- 画面に入ると、四角のタイルの登場演出が PV にも掛かる（`initReveal`。動かさない人にも、内容は見える）。
- 左の一覧（目次）は、`.dev-item` の `h3` から自動で作られるので、足すものは無い。

## 3. 確認

1. 幅375px・1440px で、PV の枠が画面からはみ出さず、PV → スクリーンショット → 説明の順に並ぶこと。横スクロールが出ないこと。
2. 再生・停止・再生位置・消音が動くこと。ほかの動画を再生すると、先の動画が止まること。
3. JS を切っても、標準の操作で再生できること。
4. 全ファイルを `grep -ri` して、禁止している文字列が混ざっていないか確かめる。`git status` で、意図したファイルだけが増えているか確かめる。
5. **コミット・push は、本人の承認を得てから**。

最後に、README.md・CLAUDE.md の Develop の説明に、足した作品に関わる内容があれば直す。
