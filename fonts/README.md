# fonts

サイトで使っているWebフォントです。どちらも SIL Open Font License 1.1 で配布されているフォントで、ライセンス全文を同じフォルダに置いています。

| ファイル | 元のフォント | ライセンス |
| --- | --- | --- |
| `kokoro-regular.woff2` | [Kokoro](https://fonts.google.com/specimen/Kokoro)（かな・記号のみ。漢字は含まれません） | [OFL-kokoro.txt](OFL-kokoro.txt) |
| `zen-old-mincho-regular.woff2` | [Zen Old Mincho](https://fonts.google.com/specimen/Zen+Old+Mincho) Regular | [OFL-zenoldmincho.txt](OFL-zenoldmincho.txt) |

## 加工の内容

元のファイル（Google Fonts のリポジトリにあるTTF）を、woff2 に変換しています。

- Zen Old Mincho は容量を減らすため、次の文字だけに縮小しています（約830KB）。
  - ASCII、全角の英数字と記号、JIS X 0208 の非漢字と第1水準漢字、ペンネームの漢字
  - 含まれない文字（第2水準の漢字など）は、閲覧する人の環境の明朝体で表示されます。
- Kokoro は文字の削除をせず、woff2 に変換しただけです。

## 文字を足したいとき

縮小したファイルに無い文字は、元のTTFから作り直す必要があります。
