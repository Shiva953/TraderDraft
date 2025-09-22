/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/pnlpackprogram.json`.
 */
export type Pnlpackprogram = {
  "address": "51qa3toZbwVC1zTyntYZSsyqb2uZVuxpgJeYXZPoWJcY",
  "metadata": {
    "name": "pnlpackprogram",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "claimFromPack",
      "discriminator": [
        76,
        120,
        104,
        71,
        176,
        199,
        211,
        164
      ],
      "accounts": [
        {
          "name": "pack",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "packId"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "mintKolA",
          "writable": true
        },
        {
          "name": "packKolATa",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pack"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mintKolA"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "userKolATa",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mintKolA"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mintKolB",
          "writable": true
        },
        {
          "name": "packKolBTa",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pack"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mintKolB"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "userKolBTa",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mintKolB"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mintKolC",
          "writable": true
        },
        {
          "name": "packKolCTa",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pack"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mintKolC"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "userKolCTa",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mintKolC"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mintKolD",
          "writable": true
        },
        {
          "name": "packKolDTa",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "pack"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mintKolD"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "userKolDTa",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mintKolD"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "packId",
          "type": "string"
        },
        {
          "name": "amountPerKol",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initGlobalPackPool",
      "discriminator": [
        111,
        253,
        198,
        207,
        7,
        187,
        37,
        163
      ],
      "accounts": [
        {
          "name": "globalPackPool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  112,
                  97,
                  99,
                  107,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "configAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  67,
                  79,
                  78,
                  70,
                  73,
                  71,
                  95,
                  65,
                  67,
                  67,
                  79,
                  85,
                  78,
                  84
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "address": "7E85TTXg5FjT5G6q14nZUSE3KAgjM2kjBs8ddAW6eBeR"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "totalKols",
          "type": "u8"
        }
      ]
    },
    {
      "name": "initKolVaultAndTransferV2",
      "discriminator": [
        116,
        242,
        58,
        20,
        125,
        127,
        97,
        98
      ],
      "accounts": [
        {
          "name": "globalPackPool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  112,
                  97,
                  99,
                  107,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "address": "7E85TTXg5FjT5G6q14nZUSE3KAgjM2kjBs8ddAW6eBeR"
        },
        {
          "name": "mint",
          "docs": [
            "The token mint - CRITICAL: Authority must be global_pack_pool"
          ],
          "writable": true
        },
        {
          "name": "tokenVault",
          "docs": [
            "Token vault owned by global pack pool (94% destination)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "kolTicker"
              },
              {
                "kind": "account",
                "path": "globalPackPool"
              }
            ]
          }
        },
        {
          "name": "poolTokenAccount",
          "docs": [
            "Pool token account (6% destination) - provided by client",
            "Assumes pool is already created by client[meteora createPool DAMM v2 ixn] and will be used for Meteora pool creation"
          ],
          "writable": true
        },
        {
          "name": "configAccount",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  67,
                  79,
                  78,
                  70,
                  73,
                  71,
                  95,
                  65,
                  67,
                  67,
                  79,
                  85,
                  78,
                  84
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "kolTicker",
          "type": "string"
        },
        {
          "name": "totalSupply",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [],
      "args": []
    },
    {
      "name": "mintAndInitKolTokenVaultAndTransfer",
      "discriminator": [
        32,
        44,
        17,
        11,
        82,
        168,
        96,
        115
      ],
      "accounts": [
        {
          "name": "globalPackPool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  112,
                  97,
                  99,
                  107,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "address": "7E85TTXg5FjT5G6q14nZUSE3KAgjM2kjBs8ddAW6eBeR"
        },
        {
          "name": "mint",
          "writable": true
        },
        {
          "name": "adminTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "admin"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenVault",
          "docs": [
            "The token vault (destination for tokens)",
            "Owned by the global pack pool - will be initialized in this instruction"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "kolTicker"
              },
              {
                "kind": "account",
                "path": "globalPackPool"
              }
            ]
          }
        },
        {
          "name": "configAccount",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  67,
                  79,
                  78,
                  70,
                  73,
                  71,
                  95,
                  65,
                  67,
                  67,
                  79,
                  85,
                  78,
                  84
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "kolTicker",
          "type": "string"
        },
        {
          "name": "totalSupply",
          "type": "u64"
        },
        {
          "name": "vaultTransferAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "packReveal",
      "discriminator": [
        248,
        180,
        65,
        134,
        121,
        14,
        74,
        157
      ],
      "accounts": [
        {
          "name": "globalPackPool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  112,
                  97,
                  99,
                  107,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "address": "7E85TTXg5FjT5G6q14nZUSE3KAgjM2kjBs8ddAW6eBeR"
        },
        {
          "name": "packAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "packId"
              }
            ]
          }
        },
        {
          "name": "mintKolA"
        },
        {
          "name": "mintKolB"
        },
        {
          "name": "mintKolC"
        },
        {
          "name": "mintKolD"
        },
        {
          "name": "configAccount",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  67,
                  79,
                  78,
                  70,
                  73,
                  71,
                  95,
                  65,
                  67,
                  67,
                  79,
                  85,
                  78,
                  84
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "packId",
          "type": "string"
        },
        {
          "name": "kols",
          "type": {
            "vec": {
              "defined": {
                "name": "kolInfoInput"
              }
            }
          }
        }
      ]
    },
    {
      "name": "transferFromKolVaultToUser",
      "discriminator": [
        69,
        97,
        58,
        66,
        113,
        176,
        34,
        69
      ],
      "accounts": [
        {
          "name": "globalPackPool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  112,
                  97,
                  99,
                  107,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "configAccount",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  67,
                  79,
                  78,
                  70,
                  73,
                  71,
                  95,
                  65,
                  67,
                  67,
                  79,
                  85,
                  78,
                  84
                ]
              }
            ]
          }
        },
        {
          "name": "tokenVault",
          "docs": [
            "The token vault (source of tokens)",
            "Owned by the global pack pool"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "kolTicker"
              },
              {
                "kind": "account",
                "path": "globalPackPool"
              }
            ]
          }
        },
        {
          "name": "mint",
          "docs": [
            "The mint of the KOL token"
          ],
          "writable": true
        },
        {
          "name": "userTokenAccount",
          "docs": [
            "The user's token account (destination)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "kolTicker",
          "type": "string"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "transferToIndividualPack",
      "discriminator": [
        213,
        22,
        167,
        141,
        61,
        207,
        176,
        128
      ],
      "accounts": [
        {
          "name": "globalPackPool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  112,
                  97,
                  99,
                  107,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "packAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  99,
                  107
                ]
              },
              {
                "kind": "account",
                "path": "pack_account.pack_id",
                "account": "pack"
              }
            ]
          }
        },
        {
          "name": "kolMint",
          "writable": true
        },
        {
          "name": "kolTokenVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "kol"
              },
              {
                "kind": "account",
                "path": "globalPackPool"
              }
            ]
          }
        },
        {
          "name": "packKolTa",
          "writable": true
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "address": "7E85TTXg5FjT5G6q14nZUSE3KAgjM2kjBs8ddAW6eBeR"
        },
        {
          "name": "configAccount",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  67,
                  79,
                  78,
                  70,
                  73,
                  71,
                  95,
                  65,
                  67,
                  67,
                  79,
                  85,
                  78,
                  84
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "kol",
          "type": "string"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "transferToPackPool",
      "discriminator": [
        175,
        239,
        50,
        31,
        2,
        187,
        165,
        89
      ],
      "accounts": [
        {
          "name": "globalPackPool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  112,
                  97,
                  99,
                  107,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdrawFromPackPoolToAdmin",
      "discriminator": [
        55,
        14,
        24,
        77,
        107,
        178,
        144,
        194
      ],
      "accounts": [
        {
          "name": "globalPackPool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  95,
                  112,
                  97,
                  99,
                  107,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "address": "7E85TTXg5FjT5G6q14nZUSE3KAgjM2kjBs8ddAW6eBeR"
        },
        {
          "name": "configAccount",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  67,
                  79,
                  78,
                  70,
                  73,
                  71,
                  95,
                  65,
                  67,
                  67,
                  79,
                  85,
                  78,
                  84
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "configAccount",
      "discriminator": [
        189,
        255,
        97,
        70,
        186,
        189,
        24,
        102
      ]
    },
    {
      "name": "globalPackPool",
      "discriminator": [
        165,
        126,
        95,
        202,
        147,
        43,
        151,
        253
      ]
    },
    {
      "name": "pack",
      "discriminator": [
        244,
        192,
        97,
        212,
        134,
        91,
        198,
        200
      ]
    }
  ],
  "events": [
    {
      "name": "kolTokenCreated",
      "discriminator": [
        238,
        15,
        96,
        230,
        247,
        254,
        219,
        64
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorizedAdmin",
      "msg": "Unauthorized admin"
    },
    {
      "code": 6001,
      "name": "invalidSeedLength",
      "msg": "Seed longer than 32 bytes"
    },
    {
      "code": 6002,
      "name": "invalidTotalKols",
      "msg": "Invalid total KOLs count"
    },
    {
      "code": 6003,
      "name": "vaultTransferExceedsSupply",
      "msg": "Vault transfer amount exceeds total supply"
    },
    {
      "code": 6004,
      "name": "invalidSupplyAmount",
      "msg": "Invalid supply amount"
    },
    {
      "code": 6005,
      "name": "invalidKolCount",
      "msg": "Expected exactly 4 KOLs for pack reveal"
    },
    {
      "code": 6006,
      "name": "mintAddressMismatch",
      "msg": "Mint address doesn't match KOL info"
    },
    {
      "code": 6007,
      "name": "invalidKolName",
      "msg": "Invalid KOL name length"
    },
    {
      "code": 6008,
      "name": "invalidPfpUrl",
      "msg": "Invalid PFP URL length"
    },
    {
      "code": 6009,
      "name": "invalidWinrate",
      "msg": "Invalid winrate (must be <= 10000 bps)"
    },
    {
      "code": 6010,
      "name": "duplicateKolAddress",
      "msg": "Duplicate KOL address in pack"
    },
    {
      "code": 6011,
      "name": "duplicateMintAddress",
      "msg": "Duplicate mint address in pack"
    },
    {
      "code": 6012,
      "name": "invalidTransferAmount",
      "msg": "Invalid transfer amount"
    },
    {
      "code": 6013,
      "name": "insufficientVaultBalance",
      "msg": "Insufficient vault balance"
    },
    {
      "code": 6014,
      "name": "invalidPackAccount",
      "msg": "Invalid pack account provided"
    },
    {
      "code": 6015,
      "name": "invalidPackPrice",
      "msg": "Invalid pack price (must be 0.1 SOL)"
    },
    {
      "code": 6016,
      "name": "invalidClaimAmount",
      "msg": "Invalid claim amount"
    },
    {
      "code": 6017,
      "name": "insufficientPackBalance",
      "msg": "Insufficient pack balance"
    },
    {
      "code": 6018,
      "name": "invalidTokenAccount",
      "msg": "Invalid token account address"
    },
    {
      "code": 6019,
      "name": "insufficientFundsForAta",
      "msg": "Global pack pool has insufficient funds for ATA creation"
    },
    {
      "code": 6020,
      "name": "invalidPoolTokenAccount",
      "msg": "Invalid pool token account"
    },
    {
      "code": 6021,
      "name": "supplyTooLarge",
      "msg": "Supply amount too large"
    },
    {
      "code": 6022,
      "name": "invalidDistributionCalculation",
      "msg": "Invalid distribution calculation"
    }
  ],
  "types": [
    {
      "name": "configAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "globalPackPool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "totalKols",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "kolInfoInput",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "address",
            "type": "pubkey"
          },
          {
            "name": "pfpUrl",
            "type": "string"
          },
          {
            "name": "pnl",
            "type": "i64"
          },
          {
            "name": "winrateBps",
            "type": "u16"
          },
          {
            "name": "kolTokenMintAddress",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "kolTokenCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "kolTicker",
            "type": "string"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "vault",
            "type": "pubkey"
          },
          {
            "name": "poolAccount",
            "type": "pubkey"
          },
          {
            "name": "totalSupply",
            "type": "u64"
          },
          {
            "name": "vaultAmount",
            "type": "u64"
          },
          {
            "name": "poolAmount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "pack",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "packId",
            "type": "string"
          },
          {
            "name": "kolAName",
            "type": "string"
          },
          {
            "name": "kolBName",
            "type": "string"
          },
          {
            "name": "kolCName",
            "type": "string"
          },
          {
            "name": "kolDName",
            "type": "string"
          }
        ]
      }
    }
  ]
};
  
  export const IDL = {
    "address": "51qa3toZbwVC1zTyntYZSsyqb2uZVuxpgJeYXZPoWJcY",
    "metadata": {
      "name": "pnlpackprogram",
      "version": "0.1.0",
      "spec": "0.1.0",
      "description": "Created with Anchor"
    },
    "instructions": [
      {
        "name": "claim_from_pack",
        "discriminator": [
          76,
          120,
          104,
          71,
          176,
          199,
          211,
          164
        ],
        "accounts": [
          {
            "name": "pack",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    112,
                    97,
                    99,
                    107
                  ]
                },
                {
                  "kind": "arg",
                  "path": "pack_id"
                }
              ]
            }
          },
          {
            "name": "user",
            "writable": true,
            "signer": true
          },
          {
            "name": "mint_kol_a",
            "writable": true
          },
          {
            "name": "pack_kol_a_ta",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "account",
                  "path": "pack"
                },
                {
                  "kind": "account",
                  "path": "token_program"
                },
                {
                  "kind": "account",
                  "path": "mint_kol_a"
                }
              ],
              "program": {
                "kind": "const",
                "value": [
                  140,
                  151,
                  37,
                  143,
                  78,
                  36,
                  137,
                  241,
                  187,
                  61,
                  16,
                  41,
                  20,
                  142,
                  13,
                  131,
                  11,
                  90,
                  19,
                  153,
                  218,
                  255,
                  16,
                  132,
                  4,
                  142,
                  123,
                  216,
                  219,
                  233,
                  248,
                  89
                ]
              }
            }
          },
          {
            "name": "user_kol_a_ta",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "account",
                  "path": "user"
                },
                {
                  "kind": "account",
                  "path": "token_program"
                },
                {
                  "kind": "account",
                  "path": "mint_kol_a"
                }
              ],
              "program": {
                "kind": "const",
                "value": [
                  140,
                  151,
                  37,
                  143,
                  78,
                  36,
                  137,
                  241,
                  187,
                  61,
                  16,
                  41,
                  20,
                  142,
                  13,
                  131,
                  11,
                  90,
                  19,
                  153,
                  218,
                  255,
                  16,
                  132,
                  4,
                  142,
                  123,
                  216,
                  219,
                  233,
                  248,
                  89
                ]
              }
            }
          },
          {
            "name": "mint_kol_b",
            "writable": true
          },
          {
            "name": "pack_kol_b_ta",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "account",
                  "path": "pack"
                },
                {
                  "kind": "account",
                  "path": "token_program"
                },
                {
                  "kind": "account",
                  "path": "mint_kol_b"
                }
              ],
              "program": {
                "kind": "const",
                "value": [
                  140,
                  151,
                  37,
                  143,
                  78,
                  36,
                  137,
                  241,
                  187,
                  61,
                  16,
                  41,
                  20,
                  142,
                  13,
                  131,
                  11,
                  90,
                  19,
                  153,
                  218,
                  255,
                  16,
                  132,
                  4,
                  142,
                  123,
                  216,
                  219,
                  233,
                  248,
                  89
                ]
              }
            }
          },
          {
            "name": "user_kol_b_ta",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "account",
                  "path": "user"
                },
                {
                  "kind": "account",
                  "path": "token_program"
                },
                {
                  "kind": "account",
                  "path": "mint_kol_b"
                }
              ],
              "program": {
                "kind": "const",
                "value": [
                  140,
                  151,
                  37,
                  143,
                  78,
                  36,
                  137,
                  241,
                  187,
                  61,
                  16,
                  41,
                  20,
                  142,
                  13,
                  131,
                  11,
                  90,
                  19,
                  153,
                  218,
                  255,
                  16,
                  132,
                  4,
                  142,
                  123,
                  216,
                  219,
                  233,
                  248,
                  89
                ]
              }
            }
          },
          {
            "name": "mint_kol_c",
            "writable": true
          },
          {
            "name": "pack_kol_c_ta",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "account",
                  "path": "pack"
                },
                {
                  "kind": "account",
                  "path": "token_program"
                },
                {
                  "kind": "account",
                  "path": "mint_kol_c"
                }
              ],
              "program": {
                "kind": "const",
                "value": [
                  140,
                  151,
                  37,
                  143,
                  78,
                  36,
                  137,
                  241,
                  187,
                  61,
                  16,
                  41,
                  20,
                  142,
                  13,
                  131,
                  11,
                  90,
                  19,
                  153,
                  218,
                  255,
                  16,
                  132,
                  4,
                  142,
                  123,
                  216,
                  219,
                  233,
                  248,
                  89
                ]
              }
            }
          },
          {
            "name": "user_kol_c_ta",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "account",
                  "path": "user"
                },
                {
                  "kind": "account",
                  "path": "token_program"
                },
                {
                  "kind": "account",
                  "path": "mint_kol_c"
                }
              ],
              "program": {
                "kind": "const",
                "value": [
                  140,
                  151,
                  37,
                  143,
                  78,
                  36,
                  137,
                  241,
                  187,
                  61,
                  16,
                  41,
                  20,
                  142,
                  13,
                  131,
                  11,
                  90,
                  19,
                  153,
                  218,
                  255,
                  16,
                  132,
                  4,
                  142,
                  123,
                  216,
                  219,
                  233,
                  248,
                  89
                ]
              }
            }
          },
          {
            "name": "mint_kol_d",
            "writable": true
          },
          {
            "name": "pack_kol_d_ta",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "account",
                  "path": "pack"
                },
                {
                  "kind": "account",
                  "path": "token_program"
                },
                {
                  "kind": "account",
                  "path": "mint_kol_d"
                }
              ],
              "program": {
                "kind": "const",
                "value": [
                  140,
                  151,
                  37,
                  143,
                  78,
                  36,
                  137,
                  241,
                  187,
                  61,
                  16,
                  41,
                  20,
                  142,
                  13,
                  131,
                  11,
                  90,
                  19,
                  153,
                  218,
                  255,
                  16,
                  132,
                  4,
                  142,
                  123,
                  216,
                  219,
                  233,
                  248,
                  89
                ]
              }
            }
          },
          {
            "name": "user_kol_d_ta",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "account",
                  "path": "user"
                },
                {
                  "kind": "account",
                  "path": "token_program"
                },
                {
                  "kind": "account",
                  "path": "mint_kol_d"
                }
              ],
              "program": {
                "kind": "const",
                "value": [
                  140,
                  151,
                  37,
                  143,
                  78,
                  36,
                  137,
                  241,
                  187,
                  61,
                  16,
                  41,
                  20,
                  142,
                  13,
                  131,
                  11,
                  90,
                  19,
                  153,
                  218,
                  255,
                  16,
                  132,
                  4,
                  142,
                  123,
                  216,
                  219,
                  233,
                  248,
                  89
                ]
              }
            }
          },
          {
            "name": "system_program",
            "address": "11111111111111111111111111111111"
          },
          {
            "name": "token_program"
          },
          {
            "name": "associated_token_program",
            "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
          }
        ],
        "args": [
          {
            "name": "pack_id",
            "type": "string"
          },
          {
            "name": "amount_per_kol",
            "type": "u64"
          }
        ]
      },
      {
        "name": "init_global_pack_pool",
        "discriminator": [
          111,
          253,
          198,
          207,
          7,
          187,
          37,
          163
        ],
        "accounts": [
          {
            "name": "global_pack_pool",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    103,
                    108,
                    111,
                    98,
                    97,
                    108,
                    95,
                    112,
                    97,
                    99,
                    107,
                    95,
                    112,
                    111,
                    111,
                    108
                  ]
                }
              ]
            }
          },
          {
            "name": "config_account",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    67,
                    79,
                    78,
                    70,
                    73,
                    71,
                    95,
                    65,
                    67,
                    67,
                    79,
                    85,
                    78,
                    84
                  ]
                }
              ]
            }
          },
          {
            "name": "admin",
            "writable": true,
            "signer": true,
            "address": "7E85TTXg5FjT5G6q14nZUSE3KAgjM2kjBs8ddAW6eBeR"
          },
          {
            "name": "system_program",
            "address": "11111111111111111111111111111111"
          }
        ],
        "args": [
          {
            "name": "total_kols",
            "type": "u8"
          }
        ]
      },
      {
        "name": "initialize",
        "discriminator": [
          175,
          175,
          109,
          31,
          13,
          152,
          155,
          237
        ],
        "accounts": [],
        "args": []
      },
      {
        "name": "mint_and_init_kol_token_vault_and_transfer",
        "discriminator": [
          32,
          44,
          17,
          11,
          82,
          168,
          96,
          115
        ],
        "accounts": [
          {
            "name": "global_pack_pool",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    103,
                    108,
                    111,
                    98,
                    97,
                    108,
                    95,
                    112,
                    97,
                    99,
                    107,
                    95,
                    112,
                    111,
                    111,
                    108
                  ]
                }
              ]
            }
          },
          {
            "name": "admin",
            "writable": true,
            "signer": true,
            "address": "7E85TTXg5FjT5G6q14nZUSE3KAgjM2kjBs8ddAW6eBeR"
          },
          {
            "name": "mint",
            "writable": true
          },
          {
            "name": "admin_token_account",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "account",
                  "path": "admin"
                },
                {
                  "kind": "account",
                  "path": "token_program"
                },
                {
                  "kind": "account",
                  "path": "mint"
                }
              ],
              "program": {
                "kind": "const",
                "value": [
                  140,
                  151,
                  37,
                  143,
                  78,
                  36,
                  137,
                  241,
                  187,
                  61,
                  16,
                  41,
                  20,
                  142,
                  13,
                  131,
                  11,
                  90,
                  19,
                  153,
                  218,
                  255,
                  16,
                  132,
                  4,
                  142,
                  123,
                  216,
                  219,
                  233,
                  248,
                  89
                ]
              }
            }
          },
          {
            "name": "token_vault",
            "docs": [
              "The token vault (destination for tokens)",
              "Owned by the global pack pool - will be initialized in this instruction"
            ],
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    116,
                    111,
                    107,
                    101,
                    110,
                    95,
                    118,
                    97,
                    117,
                    108,
                    116
                  ]
                },
                {
                  "kind": "arg",
                  "path": "kol_ticker"
                },
                {
                  "kind": "account",
                  "path": "global_pack_pool"
                }
              ]
            }
          },
          {
            "name": "config_account",
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    67,
                    79,
                    78,
                    70,
                    73,
                    71,
                    95,
                    65,
                    67,
                    67,
                    79,
                    85,
                    78,
                    84
                  ]
                }
              ]
            }
          },
          {
            "name": "system_program",
            "address": "11111111111111111111111111111111"
          },
          {
            "name": "token_program"
          },
          {
            "name": "associated_token_program",
            "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
          },
          {
            "name": "rent",
            "address": "SysvarRent111111111111111111111111111111111"
          }
        ],
        "args": [
          {
            "name": "kol_ticker",
            "type": "string"
          },
          {
            "name": "total_supply",
            "type": "u64"
          },
          {
            "name": "vault_transfer_amount",
            "type": "u64"
          }
        ]
      },
      {
        "name": "pack_reveal",
        "discriminator": [
          248,
          180,
          65,
          134,
          121,
          14,
          74,
          157
        ],
        "accounts": [
          {
            "name": "global_pack_pool",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    103,
                    108,
                    111,
                    98,
                    97,
                    108,
                    95,
                    112,
                    97,
                    99,
                    107,
                    95,
                    112,
                    111,
                    111,
                    108
                  ]
                }
              ]
            }
          },
          {
            "name": "admin",
            "writable": true,
            "signer": true,
            "address": "7E85TTXg5FjT5G6q14nZUSE3KAgjM2kjBs8ddAW6eBeR"
          },
          {
            "name": "pack_account",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    112,
                    97,
                    99,
                    107
                  ]
                },
                {
                  "kind": "arg",
                  "path": "pack_id"
                }
              ]
            }
          },
          {
            "name": "mint_kol_a"
          },
          {
            "name": "mint_kol_b"
          },
          {
            "name": "mint_kol_c"
          },
          {
            "name": "mint_kol_d"
          },
          {
            "name": "config_account",
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    67,
                    79,
                    78,
                    70,
                    73,
                    71,
                    95,
                    65,
                    67,
                    67,
                    79,
                    85,
                    78,
                    84
                  ]
                }
              ]
            }
          },
          {
            "name": "system_program",
            "address": "11111111111111111111111111111111"
          },
          {
            "name": "token_program"
          }
        ],
        "args": [
          {
            "name": "pack_id",
            "type": "string"
          },
          {
            "name": "kols",
            "type": {
              "vec": {
                "defined": {
                  "name": "KolInfoInput"
                }
              }
            }
          }
        ]
      },
      {
        "name": "transfer_from_kol_vault_to_user",
        "discriminator": [
          69,
          97,
          58,
          66,
          113,
          176,
          34,
          69
        ],
        "accounts": [
          {
            "name": "global_pack_pool",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    103,
                    108,
                    111,
                    98,
                    97,
                    108,
                    95,
                    112,
                    97,
                    99,
                    107,
                    95,
                    112,
                    111,
                    111,
                    108
                  ]
                }
              ]
            }
          },
          {
            "name": "user",
            "writable": true
          },
          {
            "name": "admin",
            "writable": true,
            "signer": true
          },
          {
            "name": "config_account",
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    67,
                    79,
                    78,
                    70,
                    73,
                    71,
                    95,
                    65,
                    67,
                    67,
                    79,
                    85,
                    78,
                    84
                  ]
                }
              ]
            }
          },
          {
            "name": "token_vault",
            "docs": [
              "The token vault (source of tokens)",
              "Owned by the global pack pool"
            ],
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    116,
                    111,
                    107,
                    101,
                    110,
                    95,
                    118,
                    97,
                    117,
                    108,
                    116
                  ]
                },
                {
                  "kind": "arg",
                  "path": "kol_ticker"
                },
                {
                  "kind": "account",
                  "path": "global_pack_pool"
                }
              ]
            }
          },
          {
            "name": "mint",
            "docs": [
              "The mint of the KOL token"
            ],
            "writable": true
          },
          {
            "name": "user_token_account",
            "docs": [
              "The user's token account (destination)"
            ],
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "account",
                  "path": "user"
                },
                {
                  "kind": "account",
                  "path": "token_program"
                },
                {
                  "kind": "account",
                  "path": "mint"
                }
              ],
              "program": {
                "kind": "const",
                "value": [
                  140,
                  151,
                  37,
                  143,
                  78,
                  36,
                  137,
                  241,
                  187,
                  61,
                  16,
                  41,
                  20,
                  142,
                  13,
                  131,
                  11,
                  90,
                  19,
                  153,
                  218,
                  255,
                  16,
                  132,
                  4,
                  142,
                  123,
                  216,
                  219,
                  233,
                  248,
                  89
                ]
              }
            }
          },
          {
            "name": "system_program",
            "address": "11111111111111111111111111111111"
          },
          {
            "name": "token_program"
          },
          {
            "name": "associated_token_program",
            "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
          }
        ],
        "args": [
          {
            "name": "kol_ticker",
            "type": "string"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      },
      {
        "name": "transfer_to_individual_pack",
        "discriminator": [
          213,
          22,
          167,
          141,
          61,
          207,
          176,
          128
        ],
        "accounts": [
          {
            "name": "global_pack_pool",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    103,
                    108,
                    111,
                    98,
                    97,
                    108,
                    95,
                    112,
                    97,
                    99,
                    107,
                    95,
                    112,
                    111,
                    111,
                    108
                  ]
                }
              ]
            }
          },
          {
            "name": "pack_account",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    112,
                    97,
                    99,
                    107
                  ]
                },
                {
                  "kind": "account",
                  "path": "pack_account.pack_id",
                  "account": "Pack"
                }
              ]
            }
          },
          {
            "name": "kol_mint",
            "writable": true
          },
          {
            "name": "kol_token_vault",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    116,
                    111,
                    107,
                    101,
                    110,
                    95,
                    118,
                    97,
                    117,
                    108,
                    116
                  ]
                },
                {
                  "kind": "arg",
                  "path": "kol"
                },
                {
                  "kind": "account",
                  "path": "global_pack_pool"
                }
              ]
            }
          },
          {
            "name": "pack_kol_ta",
            "writable": true
          },
          {
            "name": "admin",
            "writable": true,
            "signer": true,
            "address": "7E85TTXg5FjT5G6q14nZUSE3KAgjM2kjBs8ddAW6eBeR"
          },
          {
            "name": "config_account",
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    67,
                    79,
                    78,
                    70,
                    73,
                    71,
                    95,
                    65,
                    67,
                    67,
                    79,
                    85,
                    78,
                    84
                  ]
                }
              ]
            }
          },
          {
            "name": "system_program",
            "address": "11111111111111111111111111111111"
          },
          {
            "name": "token_program"
          },
          {
            "name": "associated_token_program",
            "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
          }
        ],
        "args": [
          {
            "name": "kol",
            "type": "string"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      },
      {
        "name": "transfer_to_pack_pool",
        "discriminator": [
          175,
          239,
          50,
          31,
          2,
          187,
          165,
          89
        ],
        "accounts": [
          {
            "name": "global_pack_pool",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    103,
                    108,
                    111,
                    98,
                    97,
                    108,
                    95,
                    112,
                    97,
                    99,
                    107,
                    95,
                    112,
                    111,
                    111,
                    108
                  ]
                }
              ]
            }
          },
          {
            "name": "user",
            "writable": true,
            "signer": true
          },
          {
            "name": "system_program",
            "address": "11111111111111111111111111111111"
          }
        ],
        "args": [
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      },
      {
        "name": "withdraw_from_pack_pool_to_admin",
        "discriminator": [
          55,
          14,
          24,
          77,
          107,
          178,
          144,
          194
        ],
        "accounts": [
          {
            "name": "global_pack_pool",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    103,
                    108,
                    111,
                    98,
                    97,
                    108,
                    95,
                    112,
                    97,
                    99,
                    107,
                    95,
                    112,
                    111,
                    111,
                    108
                  ]
                }
              ]
            }
          },
          {
            "name": "admin",
            "writable": true,
            "signer": true,
            "address": "7E85TTXg5FjT5G6q14nZUSE3KAgjM2kjBs8ddAW6eBeR"
          },
          {
            "name": "config_account",
            "pda": {
              "seeds": [
                {
                  "kind": "const",
                  "value": [
                    67,
                    79,
                    78,
                    70,
                    73,
                    71,
                    95,
                    65,
                    67,
                    67,
                    79,
                    85,
                    78,
                    84
                  ]
                }
              ]
            }
          },
          {
            "name": "system_program",
            "address": "11111111111111111111111111111111"
          }
        ],
        "args": [
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    ],
    "accounts": [
      {
        "name": "ConfigAccount",
        "discriminator": [
          189,
          255,
          97,
          70,
          186,
          189,
          24,
          102
        ]
      },
      {
        "name": "GlobalPackPool",
        "discriminator": [
          165,
          126,
          95,
          202,
          147,
          43,
          151,
          253
        ]
      },
      {
        "name": "Pack",
        "discriminator": [
          244,
          192,
          97,
          212,
          134,
          91,
          198,
          200
        ]
      }
    ],
    "errors": [
      {
        "code": 6000,
        "name": "UnauthorizedAdmin",
        "msg": "Unauthorized admin"
      },
      {
        "code": 6001,
        "name": "InvalidSeedLength",
        "msg": "Seed longer than 32 bytes"
      },
      {
        "code": 6002,
        "name": "InvalidTotalKols",
        "msg": "Invalid total KOLs count"
      },
      {
        "code": 6003,
        "name": "VaultTransferExceedsSupply",
        "msg": "Vault transfer amount exceeds total supply"
      },
      {
        "code": 6004,
        "name": "InvalidSupplyAmount",
        "msg": "Invalid supply amount"
      },
      {
        "code": 6005,
        "name": "InvalidKolCount",
        "msg": "Expected exactly 4 KOLs for pack reveal"
      },
      {
        "code": 6006,
        "name": "MintAddressMismatch",
        "msg": "Mint address doesn't match KOL info"
      },
      {
        "code": 6007,
        "name": "InvalidKolName",
        "msg": "Invalid KOL name length"
      },
      {
        "code": 6008,
        "name": "InvalidPfpUrl",
        "msg": "Invalid PFP URL length"
      },
      {
        "code": 6009,
        "name": "InvalidWinrate",
        "msg": "Invalid winrate (must be <= 10000 bps)"
      },
      {
        "code": 6010,
        "name": "DuplicateKolAddress",
        "msg": "Duplicate KOL address in pack"
      },
      {
        "code": 6011,
        "name": "DuplicateMintAddress",
        "msg": "Duplicate mint address in pack"
      },
      {
        "code": 6012,
        "name": "InvalidTransferAmount",
        "msg": "Invalid transfer amount"
      },
      {
        "code": 6013,
        "name": "InsufficientVaultBalance",
        "msg": "Insufficient vault balance"
      },
      {
        "code": 6014,
        "name": "InvalidPackAccount",
        "msg": "Invalid pack account provided"
      },
      {
        "code": 6015,
        "name": "InvalidPackPrice",
        "msg": "Invalid pack price (must be 0.1 SOL)"
      },
      {
        "code": 6016,
        "name": "InvalidClaimAmount",
        "msg": "Invalid claim amount"
      },
      {
        "code": 6017,
        "name": "InsufficientPackBalance",
        "msg": "Insufficient pack balance"
      },
      {
        "code": 6018,
        "name": "InvalidTokenAccount",
        "msg": "Invalid token account address"
      },
      {
        "code": 6019,
        "name": "InsufficientFundsForATA",
        "msg": "Global pack pool has insufficient funds for ATA creation"
      }
    ],
    "types": [
      {
        "name": "ConfigAccount",
        "type": {
          "kind": "struct",
          "fields": [
            {
              "name": "admin",
              "type": "pubkey"
            }
          ]
        }
      },
      {
        "name": "GlobalPackPool",
        "type": {
          "kind": "struct",
          "fields": [
            {
              "name": "bump",
              "type": "u8"
            },
            {
              "name": "total_kols",
              "type": "u8"
            }
          ]
        }
      },
      {
        "name": "KolInfoInput",
        "type": {
          "kind": "struct",
          "fields": [
            {
              "name": "name",
              "type": "string"
            },
            {
              "name": "address",
              "type": "pubkey"
            },
            {
              "name": "pfp_url",
              "type": "string"
            },
            {
              "name": "pnl",
              "type": "i64"
            },
            {
              "name": "winrate_bps",
              "type": "u16"
            },
            {
              "name": "kol_token_mint_address",
              "type": "pubkey"
            }
          ]
        }
      },
      {
        "name": "Pack",
        "type": {
          "kind": "struct",
          "fields": [
            {
              "name": "bump",
              "type": "u8"
            },
            {
              "name": "pack_id",
              "type": "string"
            },
            {
              "name": "kol_a_name",
              "type": "string"
            },
            {
              "name": "kol_b_name",
              "type": "string"
            },
            {
              "name": "kol_c_name",
              "type": "string"
            },
            {
              "name": "kol_d_name",
              "type": "string"
            }
          ]
        }
      }
    ]
  }