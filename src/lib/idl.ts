/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/pnlpackprogram.json`.
 */
export type Pnlpackprogram = {
    "address": "Cn3xRT72q5c99rMZKseUF8TkTFrpWTFBqMoLs3pNu2ZX",
    "metadata": {
      "name": "pnlpackprogram",
      "version": "0.1.0",
      "spec": "0.1.0",
      "description": "Created with Anchor"
    },
    "instructions": [
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
        "name": "initKolTokenVaultAndTransfer",
        "discriminator": [
          124,
          152,
          218,
          182,
          98,
          151,
          20,
          35
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
              "The token mint for the vault"
            ]
          },
          {
            "name": "adminTokenAccount",
            "docs": [
              "Admin's token account (source of tokens)"
            ],
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
            "name": "amount",
            "type": "u64"
          }
        ]
      },
      {
        "name": "initTokenVault",
        "discriminator": [
          203,
          26,
          194,
          169,
          252,
          226,
          179,
          180
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
              "The token mint for the vault"
            ]
          },
          {
            "name": "tokenVault",
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
            "docs": [
              "The token mint for the vault (must already be created)"
            ],
            "writable": true
          },
          {
            "name": "adminTokenAccount",
            "docs": [
              "Admin's token account (destination for initial mint, source for transfer)"
            ],
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
        "name": "transferKolTokensToVault",
        "discriminator": [
          74,
          120,
          27,
          232,
          251,
          160,
          161,
          101
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
              "The token mint for the vault"
            ]
          },
          {
            "name": "adminTokenAccount",
            "docs": [
              "Admin's token account (source of tokens)"
            ],
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
      }
    ],
    "accounts": [
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
      }
    ],
    "types": [
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
      }
    ]
  };

  export const IDL = {
    "address": "Cn3xRT72q5c99rMZKseUF8TkTFrpWTFBqMoLs3pNu2ZX",
    "metadata": {
      "name": "pnlpackprogram",
      "version": "0.1.0",
      "spec": "0.1.0",
      "description": "Created with Anchor"
    },
    "instructions": [
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
        "name": "init_kol_token_vault_and_transfer",
        "discriminator": [
          124,
          152,
          218,
          182,
          98,
          151,
          20,
          35
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
            "docs": [
              "The token mint for the vault"
            ]
          },
          {
            "name": "admin_token_account",
            "docs": [
              "Admin's token account (source of tokens)"
            ],
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
            "name": "amount",
            "type": "u64"
          }
        ]
      },
      {
        "name": "init_token_vault",
        "discriminator": [
          203,
          26,
          194,
          169,
          252,
          226,
          179,
          180
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
            "docs": [
              "The token mint for the vault"
            ]
          },
          {
            "name": "token_vault",
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
            "docs": [
              "The token mint for the vault (must already be created)"
            ],
            "writable": true
          },
          {
            "name": "admin_token_account",
            "docs": [
              "Admin's token account (destination for initial mint, source for transfer)"
            ],
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
        "name": "transfer_kol_tokens_to_vault",
        "discriminator": [
          74,
          120,
          27,
          232,
          251,
          160,
          161,
          101
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
            "docs": [
              "The token mint for the vault"
            ]
          },
          {
            "name": "admin_token_account",
            "docs": [
              "Admin's token account (source of tokens)"
            ],
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
      }
    ],
    "accounts": [
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
      }
    ],
    "types": [
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
      }
    ]
  }