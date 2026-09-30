import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const cardsPath=path.join(root,'src/data/cards.json');
const raw=JSON.parse(fs.readFileSync(cardsPath,'utf8'));
const cards=Array.isArray(raw)?raw:raw.cards;
function card(id){const c=cards.find(x=>x.id===id&&x.set==='BSC49');if(!c)throw new Error(`Missing ${id}`);c.abilities??=[];c.effects??=[];return c;}
function putAbility(c,a){const i=c.abilities.findIndex(x=>x.id===a.id);if(i>=0)c.abilities[i]=a;else c.abilities.push(a);}
function putEffect(c,e){const i=c.effects.findIndex(x=>x.id===e.id);if(i>=0)c.effects[i]=e;else c.effects.push(e);}
const source=(event,eventPlayer='any')=>({event,scope:'source',eventPlayer});
const field=(event,eventPlayer='any')=>({event,scope:'controllerField',eventPlayer});
const trash=(event,eventPlayer='any')=>({event,scope:'controllerTrash',eventPlayer});
const hand=(event,eventPlayer='any')=>({event,scope:'controllerHand',eventPlayer});

// BSC49-003 — reveal/search, temporary reduction-symbol contribution, dual color.
{
 const c=card('BSC49-003');
 putAbility(c,{id:'bsc49-003-summon-auto37',schemaVersion:2,trigger:source('whenSummoned'),levels:[1,2,3],actions:[{type:'revealTopAndRoute',player:'self',count:3,matchSelector:{families:['Astral Soul','Divine Star','Galaxian'],nameIncludesNot:'Chamaeleopus LT'},matchedDestination:'hand',matchedLimit:1,otherwiseDestination:'bottomDeck'}]});
 putAbility(c,{id:'bsc49-003-reduction-auto37',schemaVersion:2,trigger:field('whenSummoned','self'),levels:[1,2,3],conditions:[{type:'phase',value:'main'},{type:'eventSourceCardType',cardType:'spirit'},{type:'eventSourceCost',atLeast:6}],actions:[{type:'addModifier',property:'symbols',operation:'add',value:['red','red'],selector:'source',duration:'event'}]});
 putAbility(c,{id:'bsc49-003-blue-auto37',schemaVersion:2,trigger:source('continuous'),levels:[2,3],actions:[{type:'addModifier',property:'colors',operation:'add',value:['blue'],selector:'source',duration:'whileSourceExists'},{type:'addModifier',property:'symbols',operation:'add',value:['blue'],selector:'source',duration:'whileSourceExists'}]});
}

// BSC49-005 — same-name once-per-turn Trash recovery + attack-step BP destruction observer.
{
 const c=card('BSC49-005');
 putAbility(c,{id:'bsc49-005-summon-auto37',schemaVersion:2,trigger:source('whenSummoned'),levels:[1,2],actions:[{type:'oncePerTurn',key:'bsc49-005-same-name',actions:[{type:'chooseOption',options:[{id:'spirit-or-brave',actions:[{type:'selectTarget',selector:{owner:'self',zones:['trash'],cardTypes:['spirit','brave']},allowZero:true,onSelect:{type:'returnToHand'}}]},{id:'galaxian',actions:[{type:'selectTarget',selector:{owner:'self',zones:['trash'],families:['Galaxian']},allowZero:true,onSelect:{type:'returnToHand'}}]}]}]}]});
 putAbility(c,{id:'bsc49-005-attack-auto37',schemaVersion:2,trigger:field('whenAttacks','self'),levels:[2],conditions:[{type:'phase',value:'attack'},{any:[{type:'eventSourceFamily',family:'Astral Soul'},{type:'eventSourceFamily',family:'Galaxian'},{type:'eventSourceFamily',family:'Emperor Beast'}]}],actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit'],maximumBPFromEventSource:true},allowZero:true,onSelect:{type:'destroy'}}]});
}

// BSC49-006 — reveal a Brave; when an own Spirit leaves because of opponent, free Brave Spirit-form summon.
{
 const c=card('BSC49-006');
 const reveal={type:'oncePerTurn',key:'bsc49-006-reveal',actions:[{type:'revealTopAndRoute',player:'self',count:3,matchSelector:{cardTypes:['brave']},matchedDestination:'hand',matchedLimit:1,otherwiseDestination:'bottomDeck'}]};
 putAbility(c,{id:'bsc49-006-summon-auto37',schemaVersion:2,trigger:source('whenSummoned'),levels:[1,2,3],actions:[reveal]});
 putAbility(c,{id:'bsc49-006-attack-auto37',schemaVersion:2,trigger:source('whenAttacks'),levels:[1,2,3],actions:[reveal]});
 putAbility(c,{id:'bsc49-006-leave-auto37',schemaVersion:2,trigger:field('cardMoved','self'),levels:[1,2,3],conditions:[{type:'eventMovedFromZone',zone:'field'},{type:'eventMovedByOpponent'},{type:'eventSourceCardType',cardType:'spirit'}],actions:[{type:'selectTarget',selector:{owner:'self',zones:['hand'],cardTypes:['brave']},allowZero:true,onSelect:{type:'specialSummonFromHand',free:true,asSpirit:true,cause:'effect'}}]});
}

// BSC49-007 — BP destruction + draw rider; attack reveal/search.
{
 const c=card('BSC49-007');
 putAbility(c,{id:'bsc49-007-summon-auto37',schemaVersion:2,trigger:source('whenSummoned'),levels:[1,2],actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit'],maximumBP:10000},allowZero:true,onSelect:[{type:'destroy'},{type:'draw',count:2}]}]});
 putAbility(c,{id:'bsc49-007-attack-auto37',schemaVersion:2,trigger:source('whenAttacks'),levels:[2],actions:[{type:'revealTopAndRoute',player:'self',count:3,matchSelector:{families:['Astral Soul','Divine Star','Galaxian']},matchedDestination:'hand',matchedLimit:1,otherwiseDestination:'bottomDeck'}]});
}

// BSC49-010 — Immortality Cost 1/3/5 + True Curse.
{
 const c=card('BSC49-010');
 putEffect(c,{id:'bsc49-010-immortality-auto37',type:'immortality',timing:'whenDestroyed',title:{en:'Immortality: 1/3/5',ptBR:'Immortality: 1/3/5'},text:{en:'During either Attack Step, when one of your Cost 1, 3, or 5 Spirits is destroyed, you may summon this card from your Trash.',ptBR:'Durante qualquer Attack Step, quando um dos seus Spirits de custo 1, 3 ou 5 for destruído, você pode invocar esta carta do Trash.'}});
 putAbility(c,{id:'bsc49-010-immortality-trigger-auto37',schemaVersion:2,trigger:trash('whenDestroyed','self'),conditions:[{type:'phase',value:'attack'},{any:[{type:'eventSourceCost',equals:1},{type:'eventSourceCost',equals:3},{type:'eventSourceCost',equals:5}]}],actions:[{type:'specialSummonSource',cause:'immortality'}]});
 putAbility(c,{id:'bsc49-010-true-curse-auto37',schemaVersion:2,trigger:source('cardMoved','self'),levels:[2],conditions:[{type:'activePlayer',player:'self'},{type:'eventMovedFromZone',zone:'field'},{type:'eventMovedByOpponent'}],actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit','ultimate']},allowZero:true,onSelect:{type:'destroy'}}]});
}

// BSC49-011 — Life-decrease Burst from hand, conditional draw, destroyed double core removal.
{
 const c=card('BSC49-011');
 putAbility(c,{id:'bsc49-011-burst-auto37',schemaVersion:2,trigger:hand('lifeDecreased','self'),actions:[{type:'specialSummonSource',free:true,cause:'burst'}]});
 putAbility(c,{id:'bsc49-011-summon-auto37',schemaVersion:2,trigger:source('whenSummoned'),levels:[1,2],conditions:[{type:'fieldCount',player:'self',selector:{owner:'self',zones:['field'],families:['Devotee','Astral Soul','Galaxian'],excludeSource:true},atLeast:1}],actions:[{type:'draw',count:1}]});
 putAbility(c,{id:'bsc49-011-destroyed-auto37',schemaVersion:2,trigger:source('whenDestroyed'),levels:[2],actions:[{type:'selectMultipleTargets',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit','nexus'],minimumCores:1},maxTargets:2,asManyAsPossible:true,allowZero:true,onConfirm:{type:'removeCore',amount:1,destination:'reserve'}}]});
}

// BSC49-014 — Immortality 3/5/7, destroyed core drain + draw, attack observer replays destroyed effect.
{
 const c=card('BSC49-014');
 putEffect(c,{id:'bsc49-014-immortality-auto37',type:'immortality',timing:'whenDestroyed',title:{en:'Immortality: 3/5/7',ptBR:'Immortality: 3/5/7'},text:{en:'During either Attack Step, when one of your Cost 3, 5, or 7 Spirits is destroyed, you may summon this card from your Trash.',ptBR:'Durante qualquer Attack Step, quando um dos seus Spirits de custo 3, 5 ou 7 for destruído, você pode invocar esta carta do Trash.'}});
 putAbility(c,{id:'bsc49-014-immortality-trigger-auto37',schemaVersion:2,trigger:trash('whenDestroyed','self'),conditions:[{type:'phase',value:'attack'},{any:[{type:'eventSourceCost',equals:3},{type:'eventSourceCost',equals:5},{type:'eventSourceCost',equals:7}]}],actions:[{type:'specialSummonSource',cause:'immortality'}]});
 const destroyed=[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit'],minimumCores:1},allowZero:true,onSelect:{type:'removeCore',amount:1,destination:'trash'}},{type:'draw',count:1}];
 putAbility(c,{id:'bsc49-014-destroyed-auto37',schemaVersion:2,trigger:source('whenDestroyed'),levels:[1,2,3],actions:destroyed});
 putAbility(c,{id:'bsc49-014-attack-observer-auto37',schemaVersion:2,trigger:field('whenAttacks','self'),levels:[2,3],conditions:[{type:'phase',value:'attack'},{type:'eventSourceKeyword',keyword:'immortality'}],actions:destroyed});
}

// BSC49-016 — family/cost Immortality, core removal, then free mono-Purple family summon when Immortality-summoned.
{
 const c=card('BSC49-016');
 putEffect(c,{id:'bsc49-016-immortality-auto37',type:'immortality',timing:'whenDestroyed',title:{en:'Immortality: Devotee/Dark Snake Cost 7+',ptBR:'Immortality: Devotee/Dark Snake Custo 7+'},text:{en:'When one of your Cost 7 or more Devotee/Dark Snake Spirits is destroyed during either Attack Step, you may summon this card from your Trash.',ptBR:'Quando um dos seus Spirits Devotee/Dark Snake de custo 7 ou mais for destruído durante qualquer Attack Step, você pode invocar esta carta do Trash.'}});
 putAbility(c,{id:'bsc49-016-immortality-trigger-auto37',schemaVersion:2,trigger:trash('whenDestroyed','self'),conditions:[{type:'phase',value:'attack'},{type:'eventSourceCost',atLeast:7},{any:[{type:'eventSourceFamily',family:'Devotee'},{type:'eventSourceFamily',family:'Dark Snake'}]}],actions:[{type:'specialSummonSource',cause:'immortality'}]});
 putAbility(c,{id:'bsc49-016-summon-auto37',schemaVersion:2,trigger:source('whenSummoned'),levels:[1,2,3],actions:[{type:'oncePerTurn',key:'bsc49-016-same-name',actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit'],minimumCores:1},allowZero:true,onSelect:{type:'removeCore',amount:2,destination:'reserve'}},{type:'conditional',condition:{type:'specialSummonCause',value:'immortality'},actions:[{type:'selectTarget',selector:{owner:'self',zones:['trash'],cardTypes:['spirit'],colors:['purple'],families:['Devotee','Dark Snake']},allowZero:true,onSelect:{type:'specialSummonFromTrash',free:true,cause:'immortality-chain'}}]}]}]});
}

// BSC49-017 — broad-family Immortality, summon/attack Brave destruction fallback, symbol aura.
{
 const c=card('BSC49-017');
 putEffect(c,{id:'bsc49-017-immortality-auto37',type:'immortality',timing:'whenDestroyed',title:{en:'Immortality: Devotee/Concluser/Astral Soul/Galaxian',ptBR:'Immortality: Devotee/Concluser/Astral Soul/Galaxian'},text:{en:'When one of your matching family Spirits is destroyed during either Attack Step, you may summon this card from your Trash.',ptBR:'Quando um dos seus Spirits das famílias indicadas for destruído durante qualquer Attack Step, você pode invocar esta carta do Trash.'}});
 putAbility(c,{id:'bsc49-017-immortality-trigger-auto37',schemaVersion:2,trigger:trash('whenDestroyed','self'),conditions:[{type:'phase',value:'attack'},{any:[{type:'eventSourceFamily',family:'Devotee'},{type:'eventSourceFamily',family:'Concluser'},{type:'eventSourceFamily',family:'Astral Soul'},{type:'eventSourceFamily',family:'Galaxian'}]}],actions:[{type:'specialSummonSource',cause:'immortality'}]});
 const killOrDrain=[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['brave'],includeCombined:true},allowZero:true,onSelect:{type:'destroy'},afterIfAny:[]},{type:'selectMultipleTargets',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit','nexus'],minimumCores:1},maxTargets:2,asManyAsPossible:true,allowZero:true,onConfirm:{type:'removeCore',amount:1,destination:'reserve'}}];
 putAbility(c,{id:'bsc49-017-summon-auto37',schemaVersion:2,trigger:source('whenSummoned'),levels:[1,2,3],actions:killOrDrain});
 putAbility(c,{id:'bsc49-017-attack-auto37',schemaVersion:2,trigger:source('whenAttacks'),levels:[1,2,3],actions:killOrDrain});
 putAbility(c,{id:'bsc49-017-symbol-auto37',schemaVersion:2,trigger:source('continuous'),levels:[2,3],actions:[{type:'addModifier',property:'symbols',operation:'add',value:['purple'],selector:{owner:'self',cardTypes:['spirit'],keywords:['immortality']},duration:'whileSourceExists'}]});
}

// BSC49-018 — attack mill + Brave destruction, then free Immortality summon; allied Immortality attacks refresh source.
{
 const c=card('BSC49-018');
 putAbility(c,{id:'bsc49-018-attack-auto37',schemaVersion:2,trigger:source('whenAttacks'),levels:[1,2],actions:[{type:'topDeckToTrash',player:'self',count:3},{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['brave'],includeCombined:true},allowZero:true,onSelect:{type:'destroy'}},{type:'oncePerTurn',key:'bsc49-018-immortality-summon',actions:[{type:'selectTarget',selector:{owner:'self',zones:['trash'],cardTypes:['spirit'],keywords:['immortality']},allowZero:true,onSelect:{type:'specialSummonFromTrash',free:true,cause:'effect'}}]}]});
 putAbility(c,{id:'bsc49-018-refresh-auto37',schemaVersion:2,trigger:field('whenAttacks','self'),levels:[2],conditions:[{type:'eventSourceKeyword',keyword:'immortality'}],actions:[{type:'refresh',target:'source'}]});
}

fs.writeFileSync(cardsPath,JSON.stringify(cards,null,2)+'\n');
console.log('[batch17] patched BSC49 Wave 2 automation (10 cards).');
