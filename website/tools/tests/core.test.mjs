import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {loadDefaultJapaneseParser} from 'budoux';
import {prepare, chooseBreaks} from '../../typography/core.mjs';
const parser = loadDefaultJapaneseParser();

test('DOM text, links, emphasis, ruby and authored markers survive; processing is idempotent', () => {
 const {document} = parseHTML('<html lang="ja"><body><main><p id="copy">犯罪や<strong>トラブル</strong>を防ぎ、<a href="/app/">アプリについて知る</a>。<wbr data-wrap-priority><span data-wrap-group>幅広いテーマを扱います。</span></p><p id="ruby"><ruby>情報<rt>じょうほう</rt></ruby>を届ける。</p><button>説明を開く</button><p data-wrap="off">この文章には処理を適用しない。</p></main></body></html>');
 const p=document.getElementById('copy'), text=p.textContent, link=p.querySelector('a'), strong=p.querySelector('strong'), ruby=document.getElementById('ruby').outerHTML;
 prepare(document,parser);const first=p.outerHTML;prepare(document,parser);
 assert.equal(p.outerHTML,first);assert.equal(p.textContent,text);assert.equal(p.querySelector('a'),link);assert.equal(p.querySelector('strong'),strong);assert.equal(link.getAttribute('href'),'/app/');assert.equal(document.getElementById('ruby').outerHTML,ruby);assert.equal(document.querySelectorAll('[data-wrap="off"] wbr,button wbr').length,0);assert.equal(p.querySelectorAll('[data-wrap-priority]').length,1);assert.ok(!p.textContent.includes('\u200b'));
 p.append('新しい情報も掲載します。');prepare(document,parser);assert.ok(p.textContent.endsWith('新しい情報も掲載します。'));const next=p.outerHTML;prepare(document,parser);assert.equal(p.outerHTML,next);
});
test('URL, email, menu, dates and labels stay untouched',()=>{
 const {document}=parseHTML('<html lang="ja"><body><main><nav><p>メニューの説明です。</p></nav><p>参照 https://example.com/long</p><p>お問い合わせ info@example.com</p><p class="eyebrow">アプリ体験版</p><p class="button">体験版を開く</p><li><time>2026.11.28</time><span class="news-row-title">新しいお知らせを掲載しました</span></li></main></body></html>');prepare(document,parser);assert.equal(document.querySelectorAll('p[data-jp-ready],li[data-jp-ready]').length,0);assert.ok(document.querySelector('.news-row-title[data-jp-ready]'));
});
test('punctuation and authored boundaries beat a phrase boundary without adding lines',()=>{
 const p=[{offset:0,x:0},{offset:3,x:35,kind:'punctuation'},{offset:4,x:40,kind:'phrase'},{offset:6,x:60,kind:'phrase'},{offset:8,x:80}];assert.deepEqual(chooseBreaks(p,51),[3]);p[1].kind='author';assert.deepEqual(chooseBreaks(p,51),[3]);
});
test('avoid very sparse lines and short final lines; narrow phrases fall back',()=>{
 assert.equal(chooseBreaks([{offset:0,x:0},{offset:50,x:500}],100),null);assert.deepEqual(chooseBreaks([{offset:0,x:0},{offset:4,x:40},{offset:8,x:80}],100),[]);
 const p=[{offset:0,x:0},{offset:1,x:10,kind:'punctuation'},{offset:5,x:50,kind:'phrase'},{offset:8,x:80,kind:'phrase'},{offset:9,x:90}];assert.deepEqual(chooseBreaks(p,85),[5]);
});
test('a fitting meaning group is protected; an oversized group is allowed to split',()=>{
 const p=[{offset:0,x:0},{offset:3,x:30,kind:'phrase'},{offset:5,x:50,kind:'punctuation'},{offset:8,x:80}];assert.deepEqual(chooseBreaks(p,51,[{start:3,end:8,width:50}]),[3]);assert.deepEqual(chooseBreaks(p,51,[{start:3,end:8,width:70}]),[5]);
});

test('plain JSON hints preserve text and do not duplicate or interpret HTML',()=>{
 const {document}=parseHTML('<html lang="ja"><body><main><p>これから、幅広いテーマを扱います。</p></main></body></html>');const p=document.querySelector('p'),text=p.textContent;p.setAttribute('data-wrap-groups',JSON.stringify(['幅広いテーマを扱います。','<img src=x>']));p.setAttribute('data-wrap-breaks-after',JSON.stringify(['これから、']));prepare(document,parser);const first=p.innerHTML;prepare(document,parser);assert.equal(p.innerHTML,first);assert.equal(p.textContent,text);assert.equal(p.querySelectorAll('[data-wrap-group]').length,1);assert.equal(p.querySelectorAll('[data-wrap-priority]').length,1);assert.equal(p.querySelectorAll('img').length,0);
});
test('automatic candidates do not precede prohibited punctuation or follow opening brackets',()=>{
 const {document}=parseHTML('<html lang="ja"><body><main><p>これは「新しい情報」です。さまざまなテーマ、事例などを扱います。</p></main></body></html>');prepare(document,parser);for(const w of document.querySelectorAll('wbr[data-jp-auto]')){assert.ok(!/^[、。）」』ー]/u.test(w.nextSibling?.textContent||''));assert.ok(!/[（「『]$/u.test(w.previousSibling?.textContent||''))}
});
