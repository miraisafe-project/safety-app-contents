# ミライセーフプロジェクト公式サイト・公開コンテンツ

ミライセーフプロジェクトの公式Webサイトと、アプリが読み込む公開記事データを管理します。

## サイト構成

- `/`：公式サイトトップ
- `/about/`：ミライセーフプロジェクトについて
- `/app/`：ミライセーフアプリ
- `/terms/`：利用規約
- `/privacy/`：プライバシーポリシー
- `/data/`：アプリ用公開JSON

お問い合わせフォームとWebデモのURLは `assets/js/site-config.js` で管理します。

## 公開設定

- 正式URL：`https://miraisafe-project.com/`
- 公開方法：GitHub ActionsからGitHub Pagesへデプロイ
- 独自ドメイン：GitHub PagesのCustom domain設定で管理

このリポジトリはカスタムGitHub Actionsで公開しているため、`CNAME` ファイルは使用しません。DNS設定とTLS証明書の発行状況は、GitHubのリポジトリ設定にあるPages画面で確認します。

デザインは [Forty by HTML5 UP](https://html5up.net/forty) を基に変更しており、[Creative Commons Attribution 3.0](https://html5up.net/license) の下で利用しています。
