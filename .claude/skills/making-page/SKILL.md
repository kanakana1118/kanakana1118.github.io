---
name: making-page
description: 作品ごとの「制作秘話」ページ（テキスト・画像・動画）を、叶奏の備忘録（このサイト）に足す手順。「制作秘話を足して」「〇〇の制作秘話ページを作って」「作品の裏話・メイキングを載せたい」と言われたときに使う。
---

# 制作秘話ページを足す

作品（Illust / Novel / Develop の1項目）ごとに、1ページの「制作秘話」を載せる。仕組み（見た目・目次・動画の操作バー）は `style.css` と `script.js` に入っている。**足すときは、ひな形をコピーして書き換えるだけ**で、CSS・JS は触らない。

最初に、リポジトリ直下の `CLAUDE.md`（特に「プライバシールール」と「内容に関するルール」）を読むこと。

## 0. 本人に聞くこと（推測で書かない）

**下書きがあれば、まずそれを読む**: 本人は、`drafts/making/作品のid.md` に制作秘話の下書きを書く（見本は `drafts/making/_template.md`）。`##` の見出し1つが、ページの1節になる。ファイルの先頭の `<!-- -->` は、本人への注意書きなので、ページには出さない。`【】` が残っている部分は、本人に確認する（推測で埋めない）。下書きの文章は、言い回しを変えずに HTML にする（直したら、直したことを伝える）。下書きの画像・動画のパスは、`drafts/making/` からの相対パス（`../../images/...`）になっているので、ページの置き場所からの相対パス（`../images/...`）に直す。下書きは公開されるので、`CLAUDE.md` のプライバシールールを、下書きにも当てはめて確かめる。

下書きが無いとき、または足りないときは、次を聞く。

文章・事実（制作の経緯、使った道具、苦労した点など）は、**本人から聞いた内容だけ**を書く。次を聞く。

- どの作品か（Illust・Novel・Develop のどれの、どの作品）
- 見出しと本文（下書きがあれば、それをそのまま使う。言い回しを直すときは、直したことを伝える）
- 載せる画像・動画の場所（リポジトリの外のファイル）と、それぞれのキャプション
- 載せてはいけないもの（本名・住所・位置情報・他人の顔。二次創作の作品そのものの画像は載せない。`CLAUDE.md` 参照）

分からない部分は「【仮】」と書き、本人に確認する。

## 1. ファイルを作る

| 作るもの | 置き場所 |
| --- | --- |
| ページ | 作品があるセクションのフォルダに `作品のid.html`（例: `illust/topaz-earrings.html`、`novel/ikiru-michi.html`、`dev/homepage.html`） |
| 画像 | `images/making/作品のid/`（`.webp`） |
| 動画 | `videos/making/作品のid/`（`.mp4`） |

`作品のid` は英小文字とハイフン。Novel は、`novel/index.html` の `.novel` の `id` と同じにする。

1. `.claude/skills/making-page/template.html` を、ページの置き場所にコピーする（`cp`）。
2. 「【書き換え】」と書いてある所（`<title>`、`<body data-page>`、ナビの `aria-current`、見出し、戻るリンク）を直す。`data-page` は `illust` / `novel` / `dev`（差し色が、そのセクションと同じになる）。
3. 見出しごとに `<section id="英小文字">` を書く。**2つ以上あると、左の目次が自動で出る**（`initPageToc` が `main.making section[id] > h2` から作る）。1つだけなら目次は出ない。
4. 使わない例（画像・動画・キャプション・導入文）は消す。ひな形のコメントは、残さない。

ページ内で使える部品: `<p>`、`<figure class="making-figure">`（画像または動画 + `<figcaption>`）。ほかの見た目が要るときは、`style.css` の「制作秘話」の節に足す（色は `:root` の変数。直接色コードを書かない）。

## 2. 画像の下ごしらえ

置く前に、縮小して、付属情報（EXIF・位置情報・撮影者名）を消す。置くのは縮小したものだけ（長辺1600px以内、1枚500KB以下が目安）。元の画像は、リポジトリの外に置く。ファイル名と alt に、本人を特定できる情報を入れない。

```sh
# 長辺1600px以内に縮小 + 付属情報を消して WebP に（品質は、500KB以下に収まるまで 70〜85 で調整）
magick 元の画像.png -resize '1600x1600>' -strip -quality 80 images/making/作品のid/名前.webp
magick identify images/making/作品のid/名前.webp    # width / height を確かめて、<img> に書く
ls -la images/making/作品のid/                     # サイズの確認
```

## 3. 動画の下ごしらえ

ffmpeg は入っていない。macOS 標準の `avconvert`（再エンコード。位置情報などの付属情報は、既定のフィルターで消える）と、確認用のスクリプトを使う。

- 制作過程のタイムラプスなど、音の無い動画: 音声なし・**1本8MB以下**。`<video>` に `muted` を付ける（消音ボタンが出なくなる）。
- 音声のある動画: **1本20MB以下**。`muted` は付けない（消音ボタンが出る）。
- 動画は押したときだけ再生する（`preload="none"`）。自動再生はしない。

```sh
# 変換（720p。小さくしたいときは Preset960x540 など。--help で一覧が出る）
avconvert --preset Preset1280x720 --source 元の動画.mov --output videos/making/作品のid/名前.mp4 --replace
# 長さ・音声の有無・付属情報・画面の大きさを確かめる（width / height は、ここで分かる）
python3 -I .claude/skills/making-page/inspect_video.py videos/making/作品のid/名前.mp4
# 表紙の画像（poster）を作る。動画の最初のコマが、名前.mp4.png に出る
qlmanage -t -s 1280 -o /tmp/ videos/making/作品のid/名前.mp4   # 出力先は、リポジトリの外にする
magick /tmp/名前.mp4.png -strip -quality 80 images/making/作品のid/名前-poster.webp
```

- 「付属情報: あり」と出たら、`avconvert` で作り直す（別の名前にして、確認してから置き換える）。
- 「変換ソフトの記録（x264 など）」は、映像データの中に入る、ソフトの名前。個人情報ではないので、そのままでよい。
- 元の動画は、リポジトリの外に置く。一度コミットした動画は履歴に残るので、差し替えを何度も繰り返さない。
- YouTube などの埋め込みは使わない。`<video>` を直接置く。
- `<video ... controls>` と書くと、`script.js`（`initPlayers`）が、自前の操作バー（再生・停止、再生位置、時間、消音）に替える。JS が無いときは、標準の操作で再生できる。**自前の操作バーを使う理由**: スマホの Safari で、再生中の半透明の停止ボタンを消そうとして押すと、止まってしまうため。

## 4. 作品からリンクする（本人が「ボタンを付けて」と言ったときだけ）

ページを作っただけでは、どこからもリンクされない。**空のページ・書きかけのページは公開しない**。公開してよい中身がそろったら、本人に確認して、次のどれかでつなぐ（リンク先の作品に `id` が無ければ付ける）。

| セクション | つなぎ方 |
| --- | --- |
| Illust の Pick Up | `<article class="card slide">` の中に `<div class="buttons"><a class="button" href="作品のid.html">制作秘話</a></div>` |
| Illust の Gallery | `<figure data-making="作品のid.html">` と書く（ポップアップの下に「制作秘話」ボタンが出る。`script.js` の `initGallery`）。`<figure>` に `id` も付けると、制作秘話から戻れる |
| Novel | `.novel-info` の `.buttons` に `<a class="button" href="作品のid.html">制作秘話</a>` を足す |
| Develop | `.dev-text` の `<dl class="meta">` の後ろに `<div class="buttons"><a class="button" href="作品のid.html">制作秘話</a></div>`。`.dev-item` に `id` を付ける |

戻るリンクは、ページ末尾の `.making-back`（例: `../illust/index.html#作品のid`）。Novel は、`#id` で本のページがめくれて、その作品まで移る。

## 5. 確認

1. ヘッドレス Chrome などで、幅375px と 幅1440px の見た目を確かめる（`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --headless=new --window-size=1440,1000 --screenshot=/tmp/x.png file://.../ページ.html`。ヘッドレスは幅が500px未満だと切れるので、スマホ幅は、375px の `<iframe>` を並べたページで撮る）。**横スクロールが出ない**こと（`document.documentElement.scrollWidth` が画面幅以下）。
2. 見出しが2つ以上あれば、左の目次が出る。動画の再生・停止・消音が動く。
3. JS を切っても（`script.js` を読み込まなくても）、本文と画像が読めて、動画は標準の操作で再生できる。
4. `prefers-reduced-motion: reduce` でも、内容がすべて見える（このページに、独自のアニメーションは無い）。
5. 全ファイルを `grep -ri` して、禁止している文字列（`CLAUDE.md` の「プライバシールール」。具体的な文字列は、本人に聞く）が混ざっていないか確かめる。
6. `git status` で、意図したファイルだけが増えているか確かめる。試しに作ったファイルは消す。
7. `git config user.name` / `user.email` を確かめる。**コミット・push は、本人の承認を得てから**。

最後に、README.md の「構成」と、CLAUDE.md に書き足すことがあれば直す。
