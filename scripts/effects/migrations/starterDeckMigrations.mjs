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
  })
});
