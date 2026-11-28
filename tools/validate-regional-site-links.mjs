import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const readJson = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const catalog = await readJson('data/consultations/regional_site_links.json');
const research = await readJson('docs/consultations/regional_site_links_research.json');
const existing = await readJson('data/consultations/official_site_links.json');
const consultations = await readJson('data/consultations/consultations.json');
const categories = new Map(consultations.categories.map(item => [item.id, item.name]));
// This additional category already exists in the Flutter app and national catalog.
categories.set('distress', '生きるのがつらい・消えたいとき');
const prefectureNames = '北海道 青森県 岩手県 宮城県 秋田県 山形県 福島県 茨城県 栃木県 群馬県 埼玉県 千葉県 東京都 神奈川県 新潟県 富山県 石川県 福井県 山梨県 長野県 岐阜県 静岡県 愛知県 三重県 滋賀県 京都府 大阪府 兵庫県 奈良県 和歌山県 鳥取県 島根県 岡山県 広島県 山口県 徳島県 香川県 愛媛県 高知県 福岡県 佐賀県 長崎県 熊本県 大分県 宮崎県 鹿児島県 沖縄県'.split(' ');
const date = value => {
  assert.match(value, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(new Date(value).toISOString().slice(0, 10), value);
};
const https = value => {
  const url = new URL(value);
  assert.equal(url.protocol, 'https:');
  assert.ok(!url.username && !url.password && url.hostname);
  return url.href.replace(/\/$/, '');
};
const text = value => assert.ok(typeof value === 'string' && value.trim().length > 0);
const unique = values => assert.equal(new Set(values).size, values.length);
const sameSet = (a, b) => assert.deepEqual([...a].sort(), [...b].sort());

assert.equal(catalog.version, 1);
assert.equal(research.version, 1);
date(catalog.updatedAt);
assert.equal(research.updatedAt, catalog.updatedAt);
assert.ok(Array.isArray(catalog.regionalSiteLinks));
unique(catalog.regionalSiteLinks.map(item => item.id));
unique(catalog.regionalSiteLinks.map(item => https(item.url)));
const nationalUrls = new Set(existing.officialSiteLinks.map(item => https(item.url)));
const nationalIds = new Set(existing.officialSiteLinks.map(item => item.id));
const orderKeys = [];
for (const item of catalog.regionalSiteLinks) {
  assert.match(item.id, /^[a-z][a-z0-9_]+$/);
  assert.ok(!nationalIds.has(item.id));
  assert.match(item.prefectureCode, /^(0[1-9]|[1-3][0-9]|4[0-7])$/);
  for (const field of ['name', 'provider', 'description', 'targetUsers']) text(item[field]);
  assert.ok(!nationalUrls.has(https(item.url)), `National URL duplicated: ${item.id}`);
  https(item.termsUrl);
  assert.ok(Array.isArray(item.categoryIds) && item.categoryIds.length > 0);
  unique(item.categoryIds);
  assert.deepEqual(item.categoryNames, item.categoryIds.map(id => {
    assert.ok(categories.has(id), `Unknown category: ${id}`);
    return categories.get(id);
  }));
  assert.ok(Array.isArray(item.keywords) && item.keywords.length > 0);
  unique(item.keywords);
  for (const keyword of item.keywords) {
    text(keyword);
    assert.ok([...keyword].length >= 2);
    assert.ok(!['相談', '困った', '助けて'].includes(keyword));
  }
  assert.ok(Number.isSafeInteger(item.displayOrder) && item.displayOrder > 0);
  orderKeys.push(`${item.prefectureCode}:${item.displayOrder}`);
  date(item.verifiedAt);
  assert.ok(item.verifiedAt <= catalog.updatedAt);
}
unique(orderKeys);
const sorted = [...catalog.regionalSiteLinks].sort((a, b) =>
  a.prefectureCode.localeCompare(b.prefectureCode) || a.displayOrder - b.displayOrder || a.id.localeCompare(b.id));
assert.deepEqual(catalog.regionalSiteLinks, sorted);

assert.equal(research.prefectures.length, 47);
unique(research.prefectures.map(item => item.prefectureCode));
const publishedResearch = [];
const heldResearch = [];
for (let i = 0; i < 47; i++) {
  const region = research.prefectures[i];
  assert.equal(region.prefectureCode, String(i + 1).padStart(2, '0'));
  assert.equal(region.prefectureName, prefectureNames[i]);
  assert.ok(region.candidates.length > 0);
  const local = catalog.regionalSiteLinks.filter(item => item.prefectureCode === region.prefectureCode);
  assert.equal(region.publishedCount, local.length);
  for (const candidate of region.candidates) {
    for (const field of ['name', 'provider', 'targetUsers', 'eligibility', 'contentEvidence', 'termsScope', 'decisionBasis']) text(candidate[field]);
    https(candidate.url);
    https(candidate.termsUrl);
    date(candidate.checkedAt);
    assert.ok(candidate.checkedAt <= research.updatedAt);
    assert.ok(candidate.topics.every(topic => research.topicDefinitions.includes(topic)));
    if (candidate.status === 'published') {
      const item = local.find(item => item.id === candidate.id);
      assert.ok(item, `Missing published record: ${candidate.id}`);
      for (const field of ['name', 'url', 'provider', 'targetUsers', 'termsUrl']) assert.equal(candidate[field], item[field]);
      assert.equal(candidate.contactRequirement, 'none');
      assert.equal(candidate.contentVerified, true);
      assert.equal(candidate.httpStatus, 200);
      assert.equal(candidate.holdReason, null);
      publishedResearch.push(candidate);
    } else {
      assert.equal(candidate.status, 'held');
      assert.ok(['inquiry_required', 'permission_required', 'notification_required', 'unclear'].includes(candidate.contactRequirement));
      text(candidate.holdReason);
      assert.equal(candidate.id, null);
      heldResearch.push(candidate);
    }
  }
  const covered = [...new Set(region.candidates.filter(item => item.status === 'published').flatMap(item => item.topics))];
  sameSet(region.coveredTopics, covered);
  sameSet(region.notConfirmedTopics, research.topicDefinitions.filter(topic => !covered.includes(topic)));
}
sameSet(publishedResearch.map(item => item.id), catalog.regionalSiteLinks.map(item => item.id));
unique(publishedResearch.map(item => item.id));
unique([...publishedResearch, ...heldResearch].map(item => https(item.url)));
assert.deepEqual(research.summary, {
  surveyedPrefectures: 47,
  publishedPrefectures: new Set(catalog.regionalSiteLinks.map(item => item.prefectureCode)).size,
  publishedPages: publishedResearch.length,
  heldPages: heldResearch.length,
});
assert.deepEqual(research.topicCoverage, research.topicDefinitions.map(topic => ({
  topic,
  pages: publishedResearch.filter(item => item.topics.includes(topic)).length,
  prefectures: research.prefectures.filter(item => item.coveredTopics.includes(topic)).map(item => item.prefectureCode),
})));
for (const item of research.existingNationalLinks) {
  const original = existing.officialSiteLinks.find(original => original.id === item.id);
  assert.ok(original);
  assert.equal(item.name, original.name);
  assert.equal(item.url, original.url);
}
console.log(`Validated ${publishedResearch.length} published pages in ${research.summary.publishedPrefectures} prefectures, ${heldResearch.length} held candidates, and all 47 prefecture records.`);
