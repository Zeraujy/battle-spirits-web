import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const cardsPath=path.join(root,'src/data/cards.json');
const raw=JSON.parse(fs.readFileSync(cardsPath,'utf8'));
const cards=Array.isArray(raw)?raw:raw.cards;
function card(id){const c=cards.find(x=>x.id===id&&x.set==='BS13'); if(!c) throw new Error(`Missing ${id}`); c.abilities??=[]; c.effects??=[]; return c;}
function putAbility(c,a){const i=c.abilities.findIndex(x=>x.id===a.id); if(i>=0)c.abilities[i]=a; else c.abilities.push(a);}
const source=(event,eventPlayer='any')=>({event,scope:'source',eventPlayer});
const field=(event,eventPlayer='any')=>({event,scope:'controllerField',eventPlayer});

// BS13-004 — Confront + LV3 sacrifice package into free Astral Deity summon.
{
  const c=card('BS13-004');
  putAbility(c,{id:'bs13-004-confront-auto32',schemaVersion:2,trigger:source('whenAttacks'),levels:[1,2,3],actions:[{type:'setBattleRestriction',mustBlockIfAble:true}]});
  putAbility(c,{id:'bs13-004-lv3-auto32',schemaVersion:2,trigger:source('afterBattleResolution'),levels:[3],conditions:[{type:'battleSourceRole',role:'attacker'}],actions:[{type:'selectTarget',selector:{owner:'self',zones:['field'],cardTypes:['spirit'],minimumCost:3,excludeSource:true},allowZero:true,onSelect:{type:'destroy'},afterSelect:[{type:'destroy',target:'source'},{type:'selectTarget',selector:{owner:'self',zones:['hand'],cardTypes:['spirit'],families:['Astral Deity']},allowZero:true,onSelect:{type:'specialSummonFromHand',target:'selected',free:true,cause:'phobosDragoon'}}]}]});
}

// BS13-029 — exhausted-block windows + secondary Red color.
{
  const c=card('BS13-029');
  putAbility(c,{id:'bs13-029-low-bp-block-auto32',schemaVersion:2,trigger:source('continuous'),levels:[1,2,3],actions:[{type:'addModifier',property:'allowExhaustedBlockMaxOpponentBP',operation:'set',value:6000,selector:{owner:'self',cardTypes:['spirit'],colors:['red']},duration:'whileSourceExists'}]});
  putAbility(c,{id:'bs13-029-braved-block-auto32',schemaVersion:2,trigger:source('continuous'),levels:[2,3],actions:[{type:'addModifier',property:'allowExhaustedBlockAgainstBraved',operation:'set',value:1,selector:{owner:'self',cardTypes:['spirit'],colors:['red']},duration:'whileSourceExists'}]});
  putAbility(c,{id:'bs13-029-red-auto32',schemaVersion:2,trigger:source('continuous'),levels:[3],actions:[{type:'addModifier',property:'colors',operation:'add',value:['red'],selector:'source',duration:'whileSourceExists'}]});
}

// BS13-032 — Transmigration payment, Nexus sweep, high-BP blocker lock while braved.
{
  const c=card('BS13-032');
  putAbility(c,{id:'bs13-032-summon-auto32',schemaVersion:2,trigger:source('whenSummoned'),levels:[1,2,3],actions:[{type:'selectTarget',selector:{owner:'self',zones:['field'],cardTypes:['spirit'],families:['Armed Machine'],excludeSource:true},allowZero:true,onSelect:{type:'removeCore',allCores:true,destination:'void'}},{type:'returnAllMatchingToHand',selector:{owner:'opponent',zones:['field'],cardTypes:['nexus']}}]});
  putAbility(c,{id:'bs13-032-braved-attack-auto32',schemaVersion:2,trigger:source('whenAttacks'),levels:[3],requiresCombined:true,actions:[{type:'setBattleRestriction',restriction:{maximumBlockerBP:5999}}]});
}

// BS13-042 — reacts after opponent Magic fully resolves.
{
  const c=card('BS13-042');
  putAbility(c,{id:'bs13-042-magic-auto32',schemaVersion:2,trigger:field('magicResolved','opponent'),levels:[1,2],conditions:[{type:'phase',value:'main'},{type:'activePlayer',player:'opponent'}],actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit'],maximumCost:3},allowZero:true,onSelect:{type:'destroy'}}]});
  putAbility(c,{id:'bs13-042-end-main-auto32',schemaVersion:2,trigger:field('magicResolved','opponent'),levels:[2],conditions:[{type:'phase',value:'main'},{type:'activePlayer',player:'opponent'},{type:'handSizeCompare',relation:'opponentGteSelf'}],actions:[{type:'endCurrentStep'}]});
}

// BS13-046 — summon destruction choice + global post-Magic Main ending + Assault 1.
{
  const c=card('BS13-046');
  putAbility(c,{id:'bs13-046-summon-auto32',schemaVersion:2,trigger:source('whenSummoned'),levels:[1,2],actions:[{type:'chooseOption',options:[{id:'two-low',labelEN:'Destroy up to 2 Cost 3-or-less Spirits',actions:[{type:'selectMultipleTargets',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit'],maximumCost:3},maxTargets:2,asManyAsPossible:true,allowZero:true,onConfirm:{type:'destroy'}}]},{id:'one-six',labelEN:'Destroy 1 Cost 6 Spirit',actions:[{type:'selectTarget',selector:{owner:'opponent',zones:['field'],cardTypes:['spirit'],minimumCost:6,maximumCost:6},allowZero:true,onSelect:{type:'destroy'}}]}]}]});
  putAbility(c,{id:'bs13-046-magic-end-auto32',schemaVersion:2,trigger:field('magicResolved','any'),levels:[1,2],conditions:[{type:'phase',value:'main'}],actions:[{type:'endCurrentStep'}]});
  putAbility(c,{id:'bs13-046-assault-auto32',schemaVersion:2,trigger:source('whenAttacks'),levels:[2],actions:[{type:'oncePerTurn',key:'bs13-046-assault',actions:[{type:'selectTarget',selector:{owner:'self',zones:['field'],cardTypes:['nexus'],refreshed:true},allowZero:true,onSelect:{type:'exhaust'},afterSelect:[{type:'refresh',target:'source'}]}]}]});
}

// BS13-065 — low-cost non-Fairy/Astral Soul summons enter exhausted; opposing cores protected from foreign effects.
{
  const c=card('BS13-065');
  const common=[{type:'phase',value:'main'},{type:'eventSourceCost',atMost:3},{not:{any:[{type:'eventSourceFamily',family:'Fairy'},{type:'eventSourceFamily',family:'Astral Soul'}]}}];
  putAbility(c,{id:'bs13-065-summon-self-auto32',schemaVersion:2,trigger:field('whenSummoned','self'),levels:[1,2],conditions:common,actions:[{type:'exhaust',target:'effectSource'}]});
  putAbility(c,{id:'bs13-065-summon-opp-auto32',schemaVersion:2,trigger:field('whenSummoned','opponent'),levels:[1,2],conditions:common,actions:[{type:'exhaust',target:'effectSource'}]});
  putAbility(c,{id:'bs13-065-core-lock-auto32',schemaVersion:2,trigger:source('continuous'),levels:[2],actions:[{type:'addModifier',property:'coreRemovalProtectedFromOpponentEffects',operation:'set',value:1,selector:{owner:'opponent',cardTypes:['spirit']},duration:'whileConditionTrue',condition:{all:[{type:'phase',value:'main'},{type:'activePlayer',player:'opponent'}]}}]});
}

// BS13-069 — opponent Nexus reductions disabled in their Main; own braved Spirits treated as Cost 2 at LV2.
{
  const c=card('BS13-069');
  putAbility(c,{id:'bs13-069-nexus-reduction-auto32',schemaVersion:2,trigger:source('continuous'),levels:[1,2],actions:[{type:'addModifier',property:'ignoreReductionSymbols',operation:'set',value:1,selector:{owner:'opponent',cardTypes:['nexus']},duration:'whileConditionTrue',condition:{all:[{type:'phase',value:'main'},{type:'activePlayer',player:'opponent'}]}}]});
  putAbility(c,{id:'bs13-069-braved-cost-auto32',schemaVersion:2,trigger:source('continuous'),levels:[2],actions:[{type:'addModifier',property:'printedCostOverride',operation:'set',value:2,selector:{owner:'self',cardTypes:['spirit'],braved:true},duration:'whileSourceExists'}]});
}

// BS13-071 — attack lock at <=3 Spirits + second-and-later opponent Magic ends Main Step.
{
  const c=card('BS13-071');
  putAbility(c,{id:'bs13-071-self-lock-auto32',schemaVersion:2,trigger:source('continuous'),levels:[1,2],actions:[{type:'addModifier',property:'cannotAttack',operation:'set',value:1,selector:{owner:'self',cardTypes:['spirit']},duration:'whileConditionTrue',condition:{type:'fieldCount',player:'self',selector:{cardTypes:['spirit']},atMost:3}}]});
  putAbility(c,{id:'bs13-071-opp-lock-auto32',schemaVersion:2,trigger:source('continuous'),levels:[1,2],actions:[{type:'addModifier',property:'cannotAttack',operation:'set',value:1,selector:{owner:'opponent',cardTypes:['spirit']},duration:'whileConditionTrue',condition:{type:'fieldCount',player:'opponent',selector:{cardTypes:['spirit']},atMost:3}}]});
  putAbility(c,{id:'bs13-071-magic-count-auto32',schemaVersion:2,trigger:field('magicResolved','opponent'),levels:[2],conditions:[{type:'phase',value:'main'},{type:'activePlayer',player:'opponent'},{type:'eventMagicResolvedCount',atLeast:2}],actions:[{type:'endCurrentStep'}]});
}

// BS13-072 — Trash recovery lock + Ancient Battleship Nexuses forced to LV2 while source exists.
{
  const c=card('BS13-072');
  putAbility(c,{id:'bs13-072-trash-lock-auto32',schemaVersion:2,trigger:source('continuous'),levels:[1,2],actions:[{type:'addModifier',property:'trashToHandBlocked',operation:'set',value:1,selector:{owner:'opponent'},duration:'whileSourceExists'}]});
  putAbility(c,{id:'bs13-072-ancient-lv2-auto32',schemaVersion:2,trigger:source('continuous'),levels:[2],actions:[{type:'forceLevel',all:true,selector:{owner:'self',zones:['field'],cardTypes:['nexus'],nameIncludes:'Ancient Battleship'},level:2,duration:'whileSourceExists'}]});
}

// BS13-084 — mass Ancient Battleship deployment + conditional Argo-Golem summon-effect relay + Flash BP.
{
  const c=card('BS13-084');
  putAbility(c,{id:'bs13-084-main-auto32',schemaVersion:2,trigger:source('magicMain'),actions:[{type:'deployFromTrash',all:true,selector:{owner:'self',zones:['trash'],cardTypes:['nexus'],nameIncludes:'Ancient Battleship'}},{type:'conditional',condition:{type:'fieldCount',player:'self',selector:{cardTypes:['nexus'],nameIncludes:'Ancient Battleship'},atLeast:4},then:[{type:'selectTarget',selector:{owner:'self',zones:['field'],cardTypes:['spirit'],cardId:'BS13-048'},allowZero:true,onSelect:{type:'emitSourceEvent',event:'whenSummoned',target:'selected'}}]}]});
  putAbility(c,{id:'bs13-084-flash-auto32',schemaVersion:2,trigger:source('magicFlash'),actions:[{type:'selectTarget',selector:{owner:'any',zones:['field'],cardTypes:['spirit']},allowZero:false,onSelect:{type:'modifyBP',amount:4000,duration:'turn'}}]});
}

fs.writeFileSync(cardsPath,JSON.stringify(cards,null,2)+'\n');
console.log('[batch12] patched BS13 Wave 4 automation (10 cards).');
