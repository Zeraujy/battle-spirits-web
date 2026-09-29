export const STARTER_DECK_MIGRATIONS = Object.freeze({
  SD19: Object.freeze({
    id: "sd19-phase22-first-pass",
    notes: "First fully structured Starter Deck migration pass. True-Awaken is surfaced as a structured yes/no decision at attack declaration so it no longer falls back to Manual Resolution.",
    cards: Object.freeze({
      "SD19-002": {
        replaceAbilities: [
          {
            id: "sd19-002-continuous-white-v2",
            schemaVersion: 2,
            trigger: { event: "continuous", scope: "source", eventPlayer: "any" },
            levels: [1, 2, 3],
            actions: [
              { type: "addModifier", property: "colors", operation: "add", value: ["white"], target: "source", duration: "whileSourceExists" },
              { type: "addModifier", property: "symbols", operation: "add", value: ["white"], target: "source", duration: "whileSourceExists" }
            ]
          }
        ]
      },
      "SD19-005": {
        addAbilities: [
          {
            id: "sd19-005-when-attacks-auto",
            schemaVersion: 2,
            trigger: { event: "whenAttacks", scope: "source", eventPlayer: "any" },
            levels: [1, 2, 3],
            actions: [
              { type: "modifyBP", target: "source", amount: 3000, duration: "battle" },
              {
                type: "conditional",
                condition: { type: "controlsCardType", cardType: "ultimate" },
                actions: [{ type: "modifyBP", target: "source", amount: 3000, duration: "battle" }]
              }
            ]
          }
        ]
      },
      "SD19-007": {
        addAbilities: [
          {
            id: "sd19-007-when-battles-auto",
            schemaVersion: 2,
            trigger: { event: "whenBattles", scope: "source", eventPlayer: "any" },
            levels: [1, 2, 3],
            actions: [
              {
                type: "selectTarget",
                titlePT: "Aizendragon — Quando Batalha",
                titleEN: "Aizendragon — When This Spirit Battles",
                instructionPT: "Escolha 1 Spirit do oponente com 3000 BP ou menos.",
                instructionEN: "Choose 1 opposing Spirit with 3000 BP or less.",
                selector: { owner: "opponent", cardTypes: ["spirit"], maxBP: 3000 },
                allowZero: true,
                onSelect: { type: "destroy" },
                afterSelect: [
                  {
                    type: "conditional",
                    condition: { type: "controlsCardType", cardType: "ultimate" },
                    actions: [{ type: "draw", amount: 1 }]
                  }
                ]
              }
            ]
          }
        ]
      },
      "SD19-010": {
        addAbilities: [
          {
            id: "sd19-010-when-summoned-auto",
            schemaVersion: 2,
            trigger: { event: "whenSummoned", scope: "source", eventPlayer: "any" },
            levels: [3, 4],
            actions: [
              {
                type: "selectTarget",
                titlePT: "Ultimate Ma-Gwo — Quando Invocado",
                titleEN: "Ultimate Ma-Gwo — When Summoned",
                instructionPT: "Escolha 1 Spirit do oponente com 6000 BP ou menos.",
                instructionEN: "Choose 1 opposing Spirit with 6000 BP or less.",
                selector: { owner: "opponent", cardTypes: ["spirit"], maxBP: 6000 },
                allowZero: true,
                onSelect: { type: "destroy" }
              }
            ]
          }
        ]
      },
      "SD19-011": {
        addAbilities: [
          {
            id: "sd19-011-own-attack-step-auto",
            schemaVersion: 2,
            trigger: { event: "attackStep", scope: "controllerField", eventPlayer: "self" },
            levels: [1, 2],
            actions: [
              {
                type: "addModifier",
                property: "bp",
                operation: "add",
                value: 2000,
                selector: { owner: "self", cardTypes: ["spirit", "ultimate"], colors: ["red"] },
                duration: "whileConditionTrue",
                condition: { all: [{ type: "phase", value: "attack" }, { type: "activePlayer", player: "self" }] }
              }
            ]
          },
          {
            id: "sd19-011-life-decreased-auto",
            schemaVersion: 2,
            trigger: { event: "lifeDecreased", scope: "controllerField", eventPlayer: "self" },
            levels: [2],
            conditions: [
              { type: "phase", value: "attack" },
              { type: "activePlayer", player: "opponent" }
            ],
            actions: [
              {
                type: "conditional",
                condition: { type: "controlsCardType", cardType: "ultimate" },
                actions: [
                  {
                    type: "selectTarget",
                    titlePT: "The Village of Hunters",
                    instructionPT: "Escolha 1 Spirit do oponente com 5000 BP ou menos.",
                    selector: { owner: "opponent", cardTypes: ["spirit"], maxBP: 5000 },
                    allowZero: true,
                    onSelect: { type: "destroy" }
                  }
                ],
                else: [
                  {
                    type: "selectTarget",
                    titlePT: "The Village of Hunters",
                    instructionPT: "Escolha 1 Spirit do oponente com 4000 BP ou menos.",
                    selector: { owner: "opponent", cardTypes: ["spirit"], maxBP: 4000 },
                    allowZero: true,
                    onSelect: { type: "destroy" }
                  }
                ]
              }
            ]
          }
        ],
        automationRefs: {
          "sd19-011-opponent-attack-step": "sd19-011-life-decreased-auto"
        }
      },
      "SD19-012": {
        addAbilities: [
          {
            id: "sd19-012-first-ultimate-attack-auto",
            schemaVersion: 2,
            trigger: { event: "whenAttacks", scope: "controllerField", eventPlayer: "self" },
            levels: [1, 2],
            conditions: [
              { type: "attackNumber", equals: 1 },
              { type: "eventSourceCardType", cardType: "ultimate" }
            ],
            actions: [{ type: "draw", amount: 1 }]
          },
          {
            id: "sd19-012-bp-destruction-auto",
            schemaVersion: 2,
            trigger: { event: "whenDestroyed", scope: "controllerField", eventPlayer: "opponent" },
            levels: [2],
            conditions: [
              { type: "phase", value: "attack" },
              { type: "activePlayer", player: "self" },
              { type: "eventCause", value: "bpComparison" }
            ],
            actions: [
              {
                type: "selectTarget",
                titlePT: "The Red Dawn Sky",
                instructionPT: "Escolha 1 Nexus do oponente para destruir.",
                selector: { owner: "opponent", cardTypes: ["nexus"] },
                allowZero: true,
                onSelect: { type: "destroy" }
              }
            ]
          }
        ],
        automationRefs: {
          "sd19-012-first-ultimate-attack": "sd19-012-first-ultimate-attack-auto",
          "sd19-012-bp-destruction": "sd19-012-bp-destruction-auto"
        }
      },
      "SD19-014": {
        replaceAbilityById: {
          "sd19-014-burst-life": {
            id: "sd19-014-burst-life",
            schemaVersion: 2,
            trigger: { event: "burstLifeDecrease", scope: "source", eventPlayer: "any" },
            actions: [
              {
                type: "selectTarget",
                titlePT: "Blazing Burst",
                instructionPT: "Escolha até 1 Spirit do oponente com 5000 BP ou menos.",
                selector: { owner: "opponent", cardTypes: ["spirit"], maxBP: 5000 },
                allowZero: true,
                onSelect: { type: "destroy" },
                afterSelect: [
                  {
                    type: "chooseYesNo",
                    titlePT: "Blazing Burst — Flash",
                    titleEN: "Blazing Burst — Flash",
                    instructionPT: "Pagar o custo desta carta para ativar seu efeito Flash?",
                    instructionEN: "Pay this card's cost to activate its Flash effect?",
                    yesActions: [
                      {
                        type: "paySourceCost",
                        actions: [
                          {
                            type: "selectTarget",
                            titlePT: "Blazing Burst — Flash",
                            instructionPT: "Escolha 1 dos seus Spirits Vermelhos para destruir.",
                            selector: { owner: "self", cardTypes: ["spirit"], colors: ["red"] },
                            allowZero: true,
                            onSelect: { type: "destroy" },
                            afterSelect: [
                              { type: "setTurnProtection", protection: { type: "limitSpiritAttackLifeDamage", maxDamage: 1 } }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        }
      },
      "SD19-X01": {
        addAbilities: [
          {
            id: "sd19-x01-true-awaken-auto",
            schemaVersion: 2,
            trigger: { event: "whenAttacks", scope: "source", eventPlayer: "any" },
            levels: [4, 5],
            actions: [
              {
                type: "chooseYesNo",
                titlePT: "True-Awaken",
                titleEN: "True-Awaken",
                instructionPT: "Mover 1 Core de um dos seus Spirits para este Ultimate e receber +3000 BP?",
                instructionEN: "Move 1 Core from one of your Spirits to this Ultimate and gain +3000 BP?",
                yesActions: [
                  {
                    type: "selectTarget",
                    titlePT: "True-Awaken",
                    instructionPT: "Escolha 1 dos seus Spirits com pelo menos 1 Core regular.",
                    selector: { owner: "self", cardTypes: ["spirit"], minimumCores: 1, excludeSource: true },
                    allowZero: true,
                    onSelect: { type: "moveCoreSelectedToSource", amount: 1 },
                    afterSelect: [{ type: "modifyBP", target: "source", amount: 3000, duration: "battle" }]
                  }
                ]
              }
            ]
          }
        ],
        automationRefs: {
          "sd19-x01-true-awaken": "sd19-x01-true-awaken-auto"
        }
      }
    })
  }),
  SD20: Object.freeze({
    id: "sd20-content-migration-batch2",
    notes: "SD20 migration pass through Batch 02: exhausted blocking, Heavy Armor: Red, opponent Attack Step BP protection, Ultimate effect Life-loss cap, and destruction observers are structured alongside the Batch 01 effects.",
    cards: Object.freeze({
      "SD20-004": {
        addAbilities: [
          {
            id: "sd20-004-exhausted-block-auto",
            schemaVersion: 2,
            trigger: { event: "attackStep", scope: "controllerField", eventPlayer: "opponent" },
            levels: [1, 2, 3],
            actions: [
              {
                type: "addModifier",
                property: "allowExhaustedBlock",
                operation: "set",
                value: 1,
                target: "source",
                duration: "whileConditionTrue",
                condition: { all: [{ type: "phase", value: "attack" }, { type: "activePlayer", player: "opponent" }] }
              }
            ]
          },
          {
            id: "sd20-004-heavy-armor-red-auto",
            schemaVersion: 2,
            trigger: { event: "continuous", scope: "source", eventPlayer: "any" },
            levels: [2, 3],
            actions: [
              {
                type: "addModifier",
                property: "effectImmunityColors",
                operation: "add",
                value: ["red"],
                target: "source",
                duration: "whileSourceExists"
              }
            ]
          }
        ],
        automationRefs: {
          "sd20-004-exhausted-block": "sd20-004-exhausted-block-auto",
          "sd20-004-heavy-armor": "sd20-004-heavy-armor-red-auto"
        }
      },
      "SD20-011": {
        addAbilities: [
          {
            id: "sd20-011-bp-boost-auto",
            schemaVersion: 2,
            trigger: { event: "attackStep", scope: "controllerField", eventPlayer: "opponent" },
            levels: [1, 2],
            actions: [
              {
                type: "addModifier",
                property: "bp",
                operation: "add",
                value: 2000,
                selector: { owner: "self", cardTypes: ["spirit", "ultimate"], colors: ["white"] },
                duration: "whileConditionTrue",
                condition: { all: [{ type: "phase", value: "attack" }, { type: "activePlayer", player: "opponent" }] }
              }
            ]
          },
          {
            id: "sd20-011-life-protection-step-auto",
            schemaVersion: 2,
            trigger: { event: "attackStep", scope: "controllerField", eventPlayer: "opponent" },
            levels: [2],
            conditions: [{ type: "lifeAtMost", player: "self", value: 3 }],
            actions: [{ type: "setTurnProtection", protection: { type: "limitUltimateEffectLifeDamage", maxDamage: 1 } }]
          },
          {
            id: "sd20-011-life-protection-threshold-auto",
            schemaVersion: 2,
            trigger: { event: "lifeDecreased", scope: "controllerField", eventPlayer: "self" },
            levels: [2],
            conditions: [
              { type: "phase", value: "attack" },
              { type: "activePlayer", player: "opponent" },
              { type: "lifeAtMost", player: "self", value: 3 }
            ],
            actions: [{ type: "setTurnProtection", protection: { type: "limitUltimateEffectLifeDamage", maxDamage: 1 } }]
          }
        ],
        automationRefs: {
          "sd20-011-bp-boost": "sd20-011-bp-boost-auto",
          "sd20-011-life-protection": "sd20-011-life-protection-step-auto"
        }
      },
      "SD20-012": {
        addAbilities: [
          {
            id: "sd20-012-return-nexus-auto",
            schemaVersion: 2,
            trigger: { event: "whenDestroyed", scope: "controllerField", eventPlayer: "self" },
            levels: [1, 2],
            conditions: [
              { any: [{ type: "eventSourceCardType", cardType: "spirit" }, { type: "eventSourceCardType", cardType: "ultimate" }] },
              { type: "eventDestroyedByOpponent" }
            ],
            actions: [
              {
                type: "selectTarget",
                titlePT: "O Mundo em Queda",
                instructionPT: "Escolha 1 Nexus do oponente para devolver à mão.",
                selector: { owner: "opponent", cardTypes: ["nexus"] },
                allowZero: true,
                onSelect: { type: "returnToHand" }
              }
            ]
          },
          {
            id: "sd20-012-return-spirit-auto",
            schemaVersion: 2,
            trigger: { event: "whenDestroyed", scope: "controllerField", eventPlayer: "self" },
            levels: [2],
            conditions: [
              { any: [{ type: "eventSourceCardType", cardType: "spirit" }, { type: "eventSourceCardType", cardType: "ultimate" }] },
              { type: "eventDestroyedByOpponent" },
              { type: "phase", value: "attack" },
              { type: "activePlayer", player: "opponent" }
            ],
            actions: [
              {
                type: "selectTarget",
                titlePT: "O Mundo em Queda — LV2",
                instructionPT: "Escolha 1 Spirit do oponente para devolver à mão.",
                selector: { owner: "opponent", cardTypes: ["spirit"] },
                allowZero: true,
                onSelect: { type: "returnToHand" }
              }
            ]
          }
        ],
        automationRefs: {
          "sd20-012-return-nexus": "sd20-012-return-nexus-auto",
          "sd20-012-return-spirit": "sd20-012-return-spirit-auto"
        }
      },
      "SD20-007": {
        addAbilities: [
          {
            id: "sd20-007-life-bp-auto",
            schemaVersion: 2,
            trigger: { event: "continuous", scope: "source", eventPlayer: "any" },
            levels: [1, 2],
            actions: [
              {
                type: "addModifier",
                property: "bp",
                operation: "add",
                value: 4000,
                target: "source",
                duration: "whileConditionTrue",
                condition: { type: "lifeAtMost", player: "self", value: 3 }
              }
            ]
          },
          {
            id: "sd20-007-when-attacks-auto",
            schemaVersion: 2,
            trigger: { event: "whenAttacks", scope: "source", eventPlayer: "any" },
            levels: [2],
            actions: [{ type: "discardOpponentSetBurst" }]
          }
        ],
        automationRefs: {
          "sd20-007-life-bp": "sd20-007-life-bp-auto",
          "sd20-007-when-attacks": "sd20-007-when-attacks-auto"
        }
      },
      "SD20-X01": {
        addAbilities: [
          {
            id: "sd20-x01-when-summoned-auto",
            schemaVersion: 2,
            trigger: { event: "whenSummoned", scope: "source", eventPlayer: "any" },
            levels: [3, 4, 5],
            actions: [
              {
                type: "selectTarget",
                titlePT: "Ultimate-Odin — Quando Invocado",
                titleEN: "Ultimate-Odin — When Summoned",
                instructionPT: "Escolha 1 Spirit do oponente para devolver à mão.",
                instructionEN: "Choose 1 opposing Spirit to return to hand.",
                selector: { owner: "opponent", cardTypes: ["spirit"] },
                onSelect: { type: "returnToHand" }
              }
            ]
          }
        ],
        automationRefs: {
          "sd20-x01-when-summoned": "sd20-x01-when-summoned-auto"
        }
      }
    })
  }),
  SD17: Object.freeze({
    id: "sd17-content-migration-batch3",
    notes: "SD17 migration through Batch 03: closes the remaining Rush, BP-comparison observer, Terra Dragon aura, and specified-attack gaps with reusable Effect Schema v2 actions/conditions.",
    cards: Object.freeze({
      "SD17-008": {
        addAbilities: [
          {
            id: "sd17-008-rush-green-auto",
            schemaVersion: 2,
            trigger: { event: "whenAttacks", scope: "source", eventPlayer: "any" },
            levels: [1, 2],
            conditions: [
              { type: "controlsSymbolColor", color: "green" },
              { type: "sourceAttackNumber", equals: 1 }
            ],
            actions: [{ type: "refresh", target: "source" }]
          }
        ],
        automationRefs: {
          "sd17-008-rush-green-display": "sd17-008-rush-green-auto"
        }
      },
      "SD17-012": {
        addAbilities: [
          {
            id: "sd17-012-bp-destroy-draw-auto",
            schemaVersion: 2,
            trigger: { event: "afterBattleResolution", scope: "controllerField", eventPlayer: "self" },
            levels: [1, 2],
            conditions: [
              { type: "phase", value: "attack" },
              { type: "activePlayer", player: "self" },
              { type: "battleOnlyOpponentSpiritDestroyed" }
            ],
            actions: [{ type: "draw", amount: 1 }]
          },
          {
            id: "sd17-012-level2-return-auto",
            schemaVersion: 2,
            trigger: { event: "whenDestroyed", scope: "controllerField", eventPlayer: "self" },
            levels: [2],
            conditions: [
              { type: "eventSourceCardType", cardType: "spirit" },
              { type: "eventDestroyedByOpponent" },
              { type: "eventDestroyedByCardType", cardType: "spirit" }
            ],
            actions: [
              {
                type: "selectTarget",
                titlePT: "Primeval Forest",
                titleEN: "Primeval Forest",
                instructionPT: "Escolha 1 Spirit Terra Dragon no seu Trash para devolver à mão.",
                instructionEN: "Choose 1 Terra Dragon Spirit in your Trash to return to hand.",
                selector: { owner: "self", zones: ["trash"], cardTypes: ["spirit"], families: ["Terra Dragon"] },
                allowZero: true,
                onSelect: { type: "returnToHand" }
              }
            ]
          }
        ],
        automationRefs: {
          "sd17-012-bp-destroy-draw-display": "sd17-012-bp-destroy-draw-auto",
          "sd17-012-level2-return-display": "sd17-012-level2-return-auto"
        }
      },
      "SD17-X01": {
        addAbilities: [
          {
            id: "sd17-x01-when-attacks-auto",
            schemaVersion: 2,
            trigger: { event: "whenAttacks", scope: "source", eventPlayer: "any" },
            levels: [1, 2, 3],
            actions: [
              {
                type: "selectTarget",
                titlePT: "DarkDragon Dark-Tyrannosaura",
                titleEN: "DarkDragon Dark-Tyrannosaura",
                instructionPT: "Escolha 1 Spirit do oponente com BP igual ou menor que este Spirit.",
                instructionEN: "Choose 1 opposing Spirit with BP equal to or less than this Spirit.",
                selector: { owner: "opponent", cardTypes: ["spirit"], maximumBPFromSource: true },
                allowZero: true,
                onSelect: { type: "destroy" }
              }
            ]
          },
          {
            id: "sd17-x01-rush-green-auto",
            schemaVersion: 2,
            trigger: { event: "afterBattleResolution", scope: "source", eventPlayer: "self" },
            levels: [1, 2, 3],
            conditions: [
              { type: "controlsSymbolColor", color: "green" },
              { type: "battleOnlyOpponentSpiritDestroyed" }
            ],
            actions: [{ type: "moveLifeToReserve", player: "opponent", amount: 1 }]
          },
          {
            id: "sd17-x01-terra-dragon-aura-auto",
            schemaVersion: 2,
            trigger: { event: "attackStep", scope: "controllerField", eventPlayer: "self" },
            levels: [2, 3],
            actions: [
              {
                type: "addModifier",
                property: "bp",
                operation: "add",
                value: 3000,
                selector: { owner: "self", cardTypes: ["spirit"], families: ["Terra Dragon"] },
                duration: "whileConditionTrue",
                condition: { all: [{ type: "phase", value: "attack" }, { type: "activePlayer", player: "self" }] }
              }
            ]
          }
        ],
        automationRefs: {
          "sd17-x01-when-attacks-display": "sd17-x01-when-attacks-auto",
          "sd17-x01-rush-green-display": "sd17-x01-rush-green-auto",
          "sd17-x01-attack-step-display": "sd17-x01-terra-dragon-aura-auto"
        }
      },
      "SD17-009": {
        addAbilities: [
          {
            id: "sd17-009-when-attacks-auto",
            schemaVersion: 2,
            trigger: { event: "whenAttacks", scope: "source", eventPlayer: "any" },
            levels: [2, 3],
            actions: [
              {
                type: "selectTarget",
                titlePT: "PiercingDragon Styragorn",
                instructionPT: "Escolha 1 Spirit do oponente com BP igual ou menor que este Spirit.",
                selector: { owner: "opponent", cardTypes: ["spirit"], maximumBPFromSource: true },
                allowZero: true,
                onSelect: { type: "destroy" }
              }
            ]
          }
        ],
        automationRefs: {
          "sd17-009-when-attacks-display": "sd17-009-when-attacks-auto"
        }
      },
      "SD17-011": {
        setFields: { braveCondition: { type: "family", value: "Terra Dragon", cardTypes: ["spirit"] } },
        addAbilities: [
          {
            id: "sd17-011-when-summoned-auto",
            schemaVersion: 2,
            trigger: { event: "whenSummoned", scope: "source", eventPlayer: "any" },
            levels: [1],
            actions: [
              {
                type: "selectTarget",
                titlePT: "ArmedMachineDragon Silveed",
                instructionPT: "Escolha 1 Spirit com Rush no seu Trash para devolver à mão.",
                selector: { owner: "self", zones: ["trash"], cardTypes: ["spirit"], keywords: ["rush"] },
                allowZero: true,
                onSelect: { type: "returnToHand" }
              }
            ]
          }
        ],
        automationRefs: {
          "sd17-011-when-summoned-display": "sd17-011-when-summoned-auto"
        }
      },
      "SD17-X02": {
        setFields: { braveCondition: { type: "costAtLeast", value: 5, cardTypes: ["spirit"] } },
        addAbilities: [
          {
            id: "sd17-x02-specified-attack-auto",
            schemaVersion: 2,
            trigger: { event: "whenAttacks", scope: "source", eventPlayer: "any" },
            requiresCombined: true,
            actions: [
              {
                type: "chooseYesNo",
                titlePT: "DarknessDemonSword Dark-Blade",
                titleEN: "DarknessDemonSword Dark-Blade",
                instructionPT: "Realizar um specified attack contra 1 Spirit ou Ultimate do oponente?",
                instructionEN: "Make a specified attack against 1 opposing Spirit or Ultimate?",
                yesActions: [
                  {
                    type: "selectTarget",
                    titlePT: "Specified Attack",
                    titleEN: "Specified Attack",
                    instructionPT: "Escolha o Spirit ou Ultimate que será atacado.",
                    instructionEN: "Choose the Spirit or Ultimate to attack.",
                    selector: { owner: "opponent", cardTypes: ["spirit", "ultimate"] },
                    allowZero: true,
                    onSelect: { type: "performSpecifiedAttack" }
                  }
                ]
              }
            ]
          }
        ],
        automationRefs: {
          "sd17-x02-while-combined-display": "sd17-x02-specified-attack-auto"
        }
      },
      "SD17-005": {
        addAbilities: [
          {
            id: "sd17-005-attack-step-auto",
            schemaVersion: 2,
            trigger: { event: "attackStep", scope: "controllerField", eventPlayer: "self" },
            levels: [1, 2, 3],
            actions: [
              {
                type: "addModifier",
                property: "bp",
                operation: "add",
                value: 2000,
                selector: { owner: "self", cardTypes: ["spirit"], families: ["Terra Dragon"] },
                duration: "whileConditionTrue",
                condition: { all: [{ type: "phase", value: "attack" }, { type: "activePlayer", player: "self" }] }
              }
            ]
          }
        ],
        automationRefs: {
          "sd17-005-attack-step-display": "sd17-005-attack-step-auto"
        }
      },
      "SD17-013": {
        addAbilities: [
          {
            id: "sd17-013-attack-step-auto",
            schemaVersion: 2,
            trigger: { event: "attackStep", scope: "controllerField", eventPlayer: "self" },
            levels: [1, 2],
            actions: [
              {
                type: "addModifier",
                property: "bp",
                operation: "add",
                value: 2000,
                selector: { owner: "self", cardTypes: ["spirit"], families: ["Terra Dragon"] },
                duration: "whileConditionTrue",
                condition: { all: [{ type: "phase", value: "attack" }, { type: "activePlayer", player: "self" }] }
              }
            ]
          },
          {
            id: "sd17-013-end-step-auto",
            schemaVersion: 2,
            trigger: { event: "endStep", scope: "source", eventPlayer: "self" },
            levels: [2],
            actions: [
              {
                type: "selectTarget",
                titlePT: "Dark Galaxy of Dusk — End Step",
                titleEN: "Dark Galaxy of Dusk — End Step",
                instructionPT: "Escolha 1 Spirit da família Terra Dragon para dar Refresh.",
                instructionEN: "Choose 1 Terra Dragon Spirit to refresh.",
                selector: { owner: "self", cardTypes: ["spirit"], families: ["Terra Dragon"] },
                allowZero: true,
                onSelect: { type: "refresh" }
              }
            ]
          }
        ],
        automationRefs: {
          "sd17-013-attack-step-display": "sd17-013-attack-step-auto",
          "sd17-013-end-step-display": "sd17-013-end-step-auto"
        }
      }
    })
  }),
  SD10: Object.freeze({
    id: "sd10-content-migration-batch4",
    notes: "SD10 migration pass: structures Charge-aware auras, dynamic attack BP, Charge-based Brave Combine, Astral Dragon attack support, effect-destruction draw observation, specified attack, and Big Bang Energy summon/draw resolution.",
    cards: Object.freeze({
      "SD10-008": {
        addAbilities: [
          {
            id: "sd10-008-attack-step-auto",
            schemaVersion: 2,
            trigger: { event: "attackStep", scope: "controllerField", eventPlayer: "self" },
            levels: [1, 2],
            actions: [
              {
                type: "addModifier",
                property: "bp",
                operation: "add",
                value: 2000,
                selector: { owner: "self", cardTypes: ["spirit"], keywords: ["chargeRed"] },
                duration: "whileConditionTrue",
                condition: { all: [{ type: "phase", value: "attack" }, { type: "activePlayer", player: "self" }] }
              }
            ]
          }
        ],
        automationRefs: { "sd10-008-attack-step-display": "sd10-008-attack-step-auto" }
      },
      "SD10-010": {
        addAbilities: [
          {
            id: "sd10-010-when-attacks-auto",
            schemaVersion: 2,
            trigger: { event: "whenAttacks", scope: "source", eventPlayer: "any" },
            levels: [2, 3],
            actions: [
              {
                type: "modifyBP",
                target: "source",
                amountPerMatching: 2000,
                countSelector: { owner: "self", cardTypes: ["spirit"], keywords: ["chargeRed"] },
                duration: "battle"
              }
            ]
          },
          {
            id: "sd10-010-specified-attack-auto",
            schemaVersion: 2,
            trigger: { event: "whenAttacks", scope: "source", eventPlayer: "any" },
            levels: [3],
            actions: [
              {
                type: "chooseYesNo",
                titlePT: "StormDragon Supercell-Dragoon",
                titleEN: "StormDragon Supercell-Dragoon",
                instructionPT: "Realizar um specified attack contra 1 Spirit ou Ultimate do oponente?",
                instructionEN: "Make a specified attack against 1 opposing Spirit or Ultimate?",
                yesActions: [
                  {
                    type: "selectTarget",
                    titlePT: "Specified Attack",
                    titleEN: "Specified Attack",
                    instructionPT: "Escolha o Spirit ou Ultimate que será atacado.",
                    instructionEN: "Choose the Spirit or Ultimate to attack.",
                    selector: { owner: "opponent", cardTypes: ["spirit", "ultimate"] },
                    allowZero: true,
                    onSelect: { type: "performSpecifiedAttack" }
                  }
                ]
              }
            ]
          }
        ],
        automationRefs: {
          "sd10-010-when-attacks-display": "sd10-010-when-attacks-auto",
          "sd10-010-specified-attack-display": "sd10-010-specified-attack-auto"
        }
      },
      "SD10-011": {
        setFields: { braveCondition: { type: "keyword", value: "chargeRed", cardTypes: ["spirit"] } },
        automationRefs: { "sd10-011-combine-condition-display": "engineNative:braveCondition" }
      },
      "SD10-012": {
        addAbilities: [
          {
            id: "sd10-012-attack-step-auto",
            schemaVersion: 2,
            trigger: { event: "attackStep", scope: "controllerField", eventPlayer: "self" },
            levels: [1, 2],
            actions: [
              {
                type: "addModifier",
                property: "bp",
                operation: "add",
                value: 2000,
                selector: { owner: "self", cardTypes: ["spirit"], families: ["Astral Dragon"] },
                duration: "whileConditionTrue",
                condition: { all: [{ type: "phase", value: "attack" }, { type: "activePlayer", player: "self" }] }
              }
            ]
          },
          {
            id: "sd10-012-effect-destroy-draw-auto",
            schemaVersion: 2,
            trigger: { event: "whenDestroyed", scope: "controllerField", eventPlayer: "opponent" },
            levels: [2],
            conditions: [
              { type: "phase", value: "attack" },
              { type: "eventDestroyedBySelf" },
              { type: "eventDestroyedByCardType", cardType: "spirit" }
            ],
            actions: [{ type: "draw", amount: 1 }]
          }
        ],
        automationRefs: {
          "sd10-012-attack-step-display": "sd10-012-attack-step-auto",
          "sd10-012-destroy-draw-display": "sd10-012-effect-destroy-draw-auto"
        }
      },
      "SD10-013": {
        addAbilities: [
          {
            id: "sd10-013-life-reduced-auto",
            schemaVersion: 2,
            trigger: { event: "lifeDecreased", scope: "controllerField", eventPlayer: "self" },
            levels: [1, 2],
            conditions: [
              { type: "eventCause", value: "unblockedAttack" },
              { type: "battleAttackerCardType", cardType: "spirit" },
              { type: "battleAttackerBP", atMost: 5000 }
            ],
            actions: [{ type: "destroy", target: "battleAttacker" }]
          },
          {
            id: "sd10-013-charge-destroy-auto",
            schemaVersion: 2,
            trigger: { event: "whenDestroyed", scope: "controllerField", eventPlayer: "opponent" },
            levels: [2],
            conditions: [
              { type: "eventDestroyedBySelf" },
              { type: "eventDestroyedByCardType", cardType: "spirit" },
              { type: "eventDestroyerKeyword", keyword: "chargeRed" }
            ],
            actions: [
              {
                type: "selectTarget",
                titlePT: "Charge Destruction",
                titleEN: "Charge Destruction",
                instructionPT: "Escolha 1 Nexus do oponente para destruir.",
                instructionEN: "Choose 1 opposing Nexus to destroy.",
                selector: { owner: "opponent", cardTypes: ["nexus"] },
                allowZero: true,
                onSelect: { type: "destroy" }
              }
            ]
          }
        ],
        automationRefs: {
          "sd10-013-life-reduced-display": "sd10-013-life-reduced-auto",
          "sd10-013-charge-destroy-display": "sd10-013-charge-destroy-auto"
        }
      },
      "SD10-X02": {
        setFields: { braveCondition: { type: "costAtLeast", value: 5, cardTypes: ["spirit"] } },
        replaceAbilities: [
          {
            id: "sd10-x02-summon",
            schemaVersion: 2,
            trigger: { event: "whenSummoned", scope: "source", eventPlayer: "any" },
            levels: [1],
            actions: [
              {
                type: "selectMultipleTargets",
                selector: { owner: "opponent", cardTypes: ["spirit"], maxBP: 3000, chargeableBPDestruction: true },
                maxTargets: 99,
                asManyAsPossible: true,
                onSelect: { type: "destroy" },
                afterSelect: [{ type: "draw", amountPerSelected: 1 }]
              }
            ]
          },
          {
            id: "sd10-x02-charge",
            event: "continuous",
            modifiers: { keywords: ["chargeRed"], bpDestructionLimitBonus: 1000 }
          },
          {
            id: "sd10-x02-combined-charge",
            event: "continuous",
            requiresCombined: true,
            modifiers: { keywords: ["chargeRed"], bpDestructionLimitBonus: 1000 }
          }
        ],
        automationRefs: {
          "sd10-x02-charge-display": "sd10-x02-charge",
          "sd10-x02-combine-condition-display": "engineNative:braveCondition",
          "sd10-x02-while-combined-display": "sd10-x02-combined-charge"
        }
      }
    })
  }),
  SD13: Object.freeze({
    id: "sd13-content-migration-batch4",
    notes: "SD13 migration pass: structures reciprocal Spirit destruction, global Core trimming, Draw Step/When Destroyed observers, Brave reveal choices, discard-as-cost Magic, Zombie attack observers, retaliation against opposing Spirit effects, and Cursedragon multi-target effects.",
    cards: Object.freeze({
      "BS01-125": {
        addAbilities: [
          {
            id: "sd13-bs01-125-flash-auto",
            schemaVersion: 2,
            trigger: { event: "magicFlash", scope: "source", eventPlayer: "any" },
            actions: [
              {
                type: "selectTarget",
                titlePT: "Deadly Balance",
                titleEN: "Deadly Balance",
                instructionPT: "Escolha 1 dos seus Spirits para destruir.",
                instructionEN: "Choose 1 of your Spirits to destroy.",
                selector: { owner: "self", cardTypes: ["spirit"] },
                onSelect: { type: "destroy" }
              },
              {
                type: "selectTarget",
                chooser: "opponent",
                titlePT: "Deadly Balance",
                titleEN: "Deadly Balance",
                instructionPT: "Escolha 1 dos seus Spirits para destruir.",
                instructionEN: "Choose 1 of your Spirits to destroy.",
                selector: { owner: "opponent", cardTypes: ["spirit"] },
                onSelect: { type: "destroy" }
              }
            ]
          }
        ],
        automationRefs: { "sd13-bs01-125-flash-display": "sd13-bs01-125-flash-auto" }
      },
      "BS06-023": {
        addAbilities: [
          {
            id: "sd13-bs06-023-summon-auto",
            schemaVersion: 2,
            trigger: { event: "whenSummoned", scope: "source", eventPlayer: "any" },
            levels: [1, 2, 3],
            actions: [
              { type: "trimCoresOnMatching", selector: { owner: "any", zones: ["field"], cardTypes: ["spirit"] }, leave: 1, preferSoul: true }
            ]
          }
        ],
        automationRefs: { "sd13-bs06-023-summon-display": "sd13-bs06-023-summon-auto" }
      },
      "BS09-015": {
        addAbilities: [
          {
            id: "sd13-bs09-015-draw-step-auto",
            schemaVersion: 2,
            trigger: { event: "drawStep", scope: "controllerField", eventPlayer: "self" },
            levels: [1, 2, 3],
            conditions: [
              { controls: { owner: "self", zones: ["field"], cardTypes: ["spirit"], minimumBP: 8000, minCount: 1 } }
            ],
            actions: [{ type: "draw", amount: 1 }]
          },
          {
            id: "sd13-bs09-015-destroyed-auto",
            schemaVersion: 2,
            trigger: { event: "whenDestroyed", scope: "source", eventPlayer: "any" },
            levels: [3],
            actions: [
              {
                type: "selectTarget",
                titlePT: "The JailBeast Gashabers",
                titleEN: "The JailBeast Gashabers",
                instructionPT: "Escolha 1 Spirit Amarelo no seu Trash para devolver à mão.",
                instructionEN: "Choose 1 Yellow Spirit in your Trash to return to hand.",
                selector: { owner: "self", zones: ["trash"], cardTypes: ["spirit"], colors: ["yellow"] },
                allowZero: true,
                onSelect: { type: "returnToHand" }
              }
            ]
          }
        ],
        automationRefs: {
          "sd13-bs09-015-draw-display": "sd13-bs09-015-draw-step-auto",
          "sd13-bs09-015-destroyed-display": "sd13-bs09-015-destroyed-auto"
        }
      },
      "BS11-051": {
        addAbilities: [
          {
            id: "sd13-bs11-051-summon-auto",
            schemaVersion: 2,
            trigger: { event: "whenSummoned", scope: "source", eventPlayer: "any" },
            levels: [1],
            actions: [
              { type: "revealTop", player: "self", amount: 2 },
              {
                type: "selectTarget",
                titlePT: "Evil-Fisher",
                titleEN: "Evil-Fisher",
                instructionPT: "Escolha 1 das cartas reveladas para adicionar à mão.",
                instructionEN: "Choose 1 revealed card to add to your hand.",
                selector: { owner: "self", zones: ["revealed"] },
                onSelect: { type: "returnToHand" },
                afterSelect: [
                  { type: "moveCard", selector: { owner: "self", zones: ["revealed"], all: true }, all: true, destination: "trash" }
                ]
              }
            ]
          }
        ],
        automationRefs: {
          "sd13-bs11-051-summon-display": "sd13-bs11-051-summon-auto",
          "sd13-bs11-051-combined-attack-display": "sd13-bs11-051-combined-attack"
        }
      },
      "BS11-075": {
        addAbilities: [
          {
            id: "sd13-bs11-075-flash-auto",
            schemaVersion: 2,
            trigger: { event: "magicFlash", scope: "source", eventPlayer: "any" },
            actions: [
              {
                type: "selectTarget",
                titlePT: "Totentanz",
                titleEN: "Totentanz",
                instructionPT: "Descarte 1 Spirit ou Brave da sua mão.",
                instructionEN: "Discard 1 Spirit or Brave from your hand.",
                selector: { owner: "self", zones: ["hand"], cardTypes: ["spirit", "brave"] },
                onSelect: { type: "discard" },
                afterSelect: [
                  {
                    type: "selectTarget",
                    titlePT: "Totentanz",
                    titleEN: "Totentanz",
                    instructionPT: "Escolha 1 Spirit do oponente para mover até 2 Cores para a Reserve.",
                    instructionEN: "Choose 1 opposing Spirit to move up to 2 Cores to its owner's Reserve.",
                    selector: { owner: "opponent", cardTypes: ["spirit"], minimumCores: 1 },
                    onSelect: { type: "removeCore", amount: 2, destination: "reserve" }
                  }
                ]
              }
            ]
          }
        ],
        automationRefs: { "sd13-bs11-075-flash-display": "sd13-bs11-075-flash-auto" }
      },
      "BS12-063": {
        addAbilities: [
          {
            id: "sd13-bs12-063-zombie-attack-auto",
            schemaVersion: 2,
            trigger: { event: "whenAttacks", scope: "controllerField", eventPlayer: "self" },
            levels: [2],
            conditions: [
              { type: "phase", value: "attack" },
              { type: "activePlayer", player: "self" },
              { type: "eventSourceFamily", family: "Zombie" }
            ],
            actions: [
              {
                type: "selectTarget",
                titlePT: "The Brigade's Skyscraper",
                titleEN: "The Brigade's Skyscraper",
                instructionPT: "Escolha 1 Spirit do oponente para mover 1 Core para a Reserve.",
                instructionEN: "Choose 1 opposing Spirit to move 1 Core to its owner's Reserve.",
                selector: { owner: "opponent", cardTypes: ["spirit"], minimumCores: 1 },
                allowZero: true,
                onSelect: { type: "removeCore", amount: 1, destination: "reserve" }
              }
            ]
          }
        ],
        automationRefs: {
          "sd13-bs12-063-deploy-display": "sd13-bs12-063-deploy",
          "sd13-bs12-063-attack-step-display": "sd13-bs12-063-zombie-attack-auto"
        }
      },
      "SD13-002": {
        addAbilities: [
          {
            id: "sd13-002-retaliation-auto",
            schemaVersion: 2,
            trigger: { event: "whenDestroyed", scope: "controllerField", eventPlayer: "self" },
            levels: [1, 2],
            conditions: [
              { type: "eventSourceCardType", cardType: "spirit" },
              { type: "eventSourceColor", color: "purple" },
              { type: "eventSourceCost", atMost: 3 },
              { type: "eventDestroyedByOpponent" },
              { type: "eventDestroyedByCardType", cardType: "spirit" }
            ],
            actions: [
              { type: "removeCore", target: "eventDestroyer", allCores: true, destination: "trash" }
            ]
          }
        ],
        automationRefs: { "sd13-002-retaliation-display": "sd13-002-retaliation-auto" }
      },
      "SD13-X01": {
        addAbilities: [
          {
            id: "sd13-x01-summon-auto",
            schemaVersion: 2,
            trigger: { event: "whenSummoned", scope: "source", eventPlayer: "any" },
            levels: [1, 2, 3],
            actions: [
              {
                type: "selectMultipleTargets",
                titlePT: "The WickedDragonKing Cursedragon",
                titleEN: "The WickedDragonKing Cursedragon",
                instructionPT: "Escolha até 2 Spirits do oponente em Exhaust para destruir.",
                instructionEN: "Choose up to 2 exhausted opposing Spirits to destroy.",
                selector: { owner: "opponent", cardTypes: ["spirit"], exhausted: true },
                maxTargets: 2,
                asManyAsPossible: true,
                onSelect: { type: "destroy" },
                afterSelect: [{ type: "draw", amountPerSelected: 1 }]
              }
            ]
          },
          {
            id: "sd13-x01-attack-auto",
            schemaVersion: 2,
            trigger: { event: "whenAttacks", scope: "source", eventPlayer: "any" },
            levels: [2, 3],
            actions: [
              {
                type: "selectMultipleTargets",
                titlePT: "The WickedDragonKing Cursedragon",
                titleEN: "The WickedDragonKing Cursedragon",
                instructionPT: "Escolha até 2 Spirits do oponente para mover 1 Core de cada para a Reserve.",
                instructionEN: "Choose up to 2 opposing Spirits to move 1 Core from each to its owner's Reserve.",
                selector: { owner: "opponent", cardTypes: ["spirit"], minimumCores: 1 },
                maxTargets: 2,
                asManyAsPossible: true,
                onSelect: { type: "removeCore", amount: 1, destination: "reserve" }
              }
            ]
          }
        ],
        automationRefs: {
          "sd13-x01-summon-display": "sd13-x01-summon-auto",
          "sd13-x01-attack-display": "sd13-x01-attack-auto"
        }
      }
    })
  })
});
