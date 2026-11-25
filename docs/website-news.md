# 公式サイトのお知らせ

データは `website/news/website_news.json` の `items` で管理します。アプリ用の `data/` とは無関係です。本文・画像・関連リンクを追加する際にHTMLやJavaScriptの編集は不要です。

## 記事の追加

既存項目をコピーし、重複しない `id`（英小文字・数字・ハイフン）、`date`（日本時間の掲載日、YYYY-MM-DD）、`title`、`category`、`action`、`published` を設定します。カテゴリは「アプリ」「活動情報」「公式サイト」「重要なお知らせ」「その他」の5種類です。

- `published: true` の記事のみ表示。未来の掲載日は到来するまで表示されません。非公開記事の詳細も表示されません。ただしJSON自体は公開ファイルなので秘密情報は保存しないでください。
- `action: "link"` は `url` へ直接移動。公式サイトのルート基準の相対URL（例 `crowdfunding/`、`./#demo`）またはHTTPSの外部URLを指定します。サイト内は同じタブ、外部は新しいタブです。
- `action: "detail"` は `/news/detail/?id=ID` で共通レイアウトの詳細を表示。記事ごとのファイル作成は不要です。

## 本文 blocks

配列の順序で表示されます。任意項目を省略しても余白は生成されません。HTMLの直接埋め込みはできません。

```json
{
  "id": "sample", "date": "2026-12-01", "title": "見出し",
  "category": "公式サイト", "action": "detail", "published": false,
  "blocks": [
    {"type": "paragraph", "text": "段落の本文"},
    {"type": "image", "src": "assets/website/news/example.webp", "alt": "画像の説明", "width": 1200, "height": 1800, "caption": "任意のキャプション"},
    {"type": "link", "url": "app/", "label": "アプリを見る"},
    {"type": "social", "service": "x", "label": "X（旧Twitter）", "account": "@MiraiSafe", "url": "https://x.com/MiraiSafe"}
  ]
}
```

`social` の `service` は `x` または `instagram`。画像は公式サイト専用の `assets/website/news/` へ置きます。縦長画像は最大360px幅で表示し、既存の共通ライトボックスで拡大できます。

## 表示と公開

トップは新しい順に3件、一覧は10件ごと（`/news/?page=2`）。同日の記事はID順で安定表示します。NEWは掲載日を含む7暦日、日本時間で自動判定され、ページを開く際の現在日付を使用します。

編集後はJSON構文と表示を確認してmainへpushします。既存のPages workflowが公式サイトとデータを一緒に公開します。表示が更新されない場合は再読み込みしてください。JSON取得失敗、空配列、不明IDには専用の案内を表示します。

検証：`node tests/website-news.cjs`（Playwrightがインストールされた環境で、`SITE_URL`にローカル確認サーバーのURLを指定）。テスト用データは通信応答を置換して使用し、公開JSONには追加しません。

Node.jsとPlaywrightのChromiumが必要です。既存のEdge等を使う場合は `BROWSER_BIN` にブラウザ実行ファイルの絶対パスを指定できます。スクリーンショットはOSの一時ディレクトリ（または `TEST_ARTIFACT_DIR`）に保存します。ルートで `python -m http.server 8766 --bind 127.0.0.1` を起動した状態なら `SITE_URL` の指定を省略できます。
