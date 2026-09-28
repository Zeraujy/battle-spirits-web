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
    id: "sd17-content-migration-batch2",
    notes: "SD17 migration through Batch 02: Batch 01 auras are retained, PiercingDragon Styragorn gains dynamic source-BP targeting, and ArmedMachineDragon Silveed gains structured Rush-trash retrieval and Terra Dragon Combine validation.",
    cards: Object.freeze({
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
        setFields: { braveCondition: { type: "costAtLeast", value: 5, cardTypes: ["spirit"] } }
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
  })
});
