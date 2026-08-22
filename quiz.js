(function () {
  "use strict";

  /*
   * ============================================================
   * INDIA LANGUAGES — QUIZ ENGINE
   * ============================================================
   *
   * Two-file architecture:
   *
   *     index.html
   *     quiz.js
   *
   * This file does NOT duplicate the application's Census dataset.
   *
   * It reads the data already exposed by index.html:
   *
   *     window.I121_DATA
   *     window.I121_STATE_C16
   *
   * The quiz is entirely client-side.
   * No login, tracking, API or server is required.
   * ============================================================
   */

  const quizState = {
    difficulty: "mixed",
    total: 10,
    index: 0,
    score: 0,
    questions: [],
    answered: false
  };


  /* ============================================================
     BASIC HELPERS
     ============================================================ */

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[char];
    });
  }


  function formatNumber(value) {
    return new Intl.NumberFormat("en-IN").format(
      Math.round(Number(value) || 0)
    );
  }


  function formatPercent(value, decimals) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "0%";
    }

    return number.toFixed(
      decimals === undefined ? 1 : decimals
    ) + "%";
  }


  function shuffle(array) {
    const result = array.slice();

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      const temporary = result[i];

      result[i] = result[j];
      result[j] = temporary;
    }

    return result;
  }


  function unique(array) {
    return [
      ...new Set(
        array
          .filter(function (value) {
            return (
              value !== null &&
              value !== undefined &&
              value !== ""
            );
          })
          .map(String)
      )
    ];
  }


  function sample(array, count) {
    return shuffle(array).slice(0, count);
  }


  /*
   * Creates multiple-choice options.
   *
   * The correct answer is always included.
   * No duplicate answers are allowed.
   */
  function createOptions(correctAnswer, possibleAnswers, count) {
    const correct = String(correctAnswer);

    const alternatives = unique(possibleAnswers)
      .filter(function (value) {
        return value !== correct;
      });

    const result = [
      correct,
      ...sample(
        alternatives,
        Math.max(
          0,
          (count || 4) - 1
        )
      )
    ];

    return shuffle(result);
  }


  function makeQuestion(
    key,
    difficulty,
    text,
    answer,
    options,
    explanation,
    category
  ) {
    return {
      key: key,
      difficulty: difficulty,
      text: text,
      answer: String(answer),
      options: shuffle(
        options.map(String)
      ),
      explanation: explanation,
      category: category
    };
  }


  /* ============================================================
     EXISTING APPLICATION DATA
     ============================================================ */

  function getLanguageData() {
    /*
     * IMPORTANT:
     *
     * The existing index.html exposes its national language
     * dataset as I121_DATA.
     *
     * We deliberately read it at quiz runtime rather than
     * creating another copy of the dataset.
     */

    if (
      !Array.isArray(
        window.I121_DATA
      )
    ) {
      return [];
    }

    return window.I121_DATA.filter(
      function (item) {
        return (
          item &&
          item.language &&
          Number.isFinite(
            Number(item.speakers)
          )
        );
      }
    );
  }


  function getStateData() {
    /*
     * Existing State / UT C-16 data.
     */

    const source =
      window.I121_STATE_C16;

    if (
      !source ||
      typeof source !== "object"
    ) {
      return {};
    }

    return source;
  }


  /* ============================================================
     QUESTION POOL
     ============================================================ */

  function buildQuestionPool() {

    const languages =
      getLanguageData();

    const states =
      getStateData();


    /*
     * If the main application data isn't available,
     * don't fabricate questions.
     */

    if (
      languages.length < 4
    ) {
      return [];
    }


    const questions = [];


    /*
     * NATIONAL RANKING
     */

    const ranked =
      languages
        .slice()
        .sort(function (a, b) {
          return (
            Number(b.speakers) -
            Number(a.speakers)
          );
        });


    const languageNames =
      languages.map(function (item) {
        return item.language;
      });


    /*
     * LANGUAGE FAMILIES
     */

    const families =
      unique(
        languages.map(function (item) {
          return (
            item.family ||
            "Other"
          );
        })
      );


    /*
     * SCHEDULE STATUS
     */

    const scheduleStatuses = [
      "Scheduled",
      "Non-Scheduled"
    ];


    /* ------------------------------------------------------------
       1. NATIONAL RANK QUESTIONS
       ------------------------------------------------------------ */

    ranked.forEach(
      function (language, index) {

        const rank =
          index + 1;


        questions.push(
          makeQuestion(
            "national-rank-" +
              rank +
              "-" +
              language.language,

            rank <= 10
              ? "easy"
              : "medium",

            "Which language ranks #" +
              rank +
              " in India by reported " +
              "mother-tongue speakers?",

            language.language,

            createOptions(
              language.language,
              languageNames,
              4
            ),

            language.language +
              " is ranked #" +
              rank +
              " with " +
              formatNumber(
                language.speakers
              ) +
              " reported mother-tongue speakers.",

            "National ranking"
          )
        );


        /*
         * Language immediately above this language.
         */

        if (index > 0) {

          const above =
            ranked[index - 1];


          questions.push(
            makeQuestion(
              "above-" +
                language.language,

              "hard",

              "Which language is immediately " +
                "above " +
                language.language +
                " in the national speaker ranking?",

              above.language,

              createOptions(
                above.language,
                languageNames,
                4
              ),

              above.language +
                " is ranked #" +
                rank +
                " and appears immediately " +
                "above " +
                language.language +
                " in the ranking.",

              "National ranking"
            )
          );
        }


        /*
         * Language immediately below this language.
         */

        if (
          index <
          ranked.length - 1
        ) {

          const below =
            ranked[index + 1];


          questions.push(
            makeQuestion(
              "below-" +
                language.language,

              "hard",

              "Which language is immediately " +
                "below " +
                language.language +
                " in the national speaker ranking?",

              below.language,

              createOptions(
                below.language,
                languageNames,
                4
              ),

              below.language +
                " is ranked #" +
                (rank + 1) +
                " in the national ranking.",

              "National ranking"
            )
          );
        }
      }
    );


    /* ------------------------------------------------------------
       2. SPEAKER COUNT QUESTIONS
       ------------------------------------------------------------ */

    sample(
      ranked,
      Math.min(
        ranked.length,
        100
      )
    ).forEach(
      function (language) {

        questions.push(
          makeQuestion(
            "speaker-count-" +
              language.language,

            "medium",

            "Which language has approximately " +
              formatNumber(
                language.speakers
              ) +
              " reported mother-tongue speakers?",

            language.language,

            createOptions(
              language.language,
              languageNames,
              4
            ),

            "The dataset records " +
              formatNumber(
                language.speakers
              ) +
              " speakers for " +
              language.language +
              ".",

            "Speaker counts"
          )
        );
      }
    );


    /* ------------------------------------------------------------
       3. LANGUAGE FAMILY QUESTIONS
       ------------------------------------------------------------ */

    languages.forEach(
      function (language) {

        if (
          !language.family
        ) {
          return;
        }


        questions.push(
          makeQuestion(
            "family-" +
              language.language,

            "easy",

            "Which language family is " +
              language.language +
              " classified under?",

            language.family,

            createOptions(
              language.family,
              families,
              4
            ),

            language.language +
              " is classified under the " +
              language.family +
              " family in the application's dataset.",

            "Language families"
          )
        );
      }
    );


    /* ------------------------------------------------------------
       4. SCHEDULED / NON-SCHEDULED
       ------------------------------------------------------------ */

    const hasScheduled =
      languages.some(
        function (language) {
          return !!language.scheduled;
        }
      );


    const hasNonScheduled =
      languages.some(
        function (language) {
          return !language.scheduled;
        }
      );


    if (
      hasScheduled &&
      hasNonScheduled
    ) {

      languages.forEach(
        function (language) {

          const answer =
            language.scheduled
              ? "Scheduled"
              : "Non-Scheduled";


          questions.push(
            makeQuestion(
              "schedule-" +
                language.language,

              "easy",

              "What is the Schedule status " +
                "shown for " +
                language.language +
                "?",

              answer,

              createOptions(
                answer,
                scheduleStatuses,
                2
              ),

              language.language +
                " is marked " +
                answer +
                " in the application's dataset.",

              "Schedule status"
            )
          );
        }
      );
    }


    /* ------------------------------------------------------------
       5. PRINCIPAL AREAS
       ------------------------------------------------------------ */

    const allAreas =
      unique(
        languages.flatMap(
          function (language) {

            if (
              !language.areas
            ) {
              return [];
            }

            return String(
              language.areas
            )
              .split(",")
              .map(function (area) {
                return area.trim();
              })
              .filter(Boolean);
          }
        )
      );


    if (
      allAreas.length >= 4
    ) {

      languages
        .filter(
          function (language) {
            return !!language.areas;
          }
        )
        .forEach(
          function (language) {

            const areas =
              String(
                language.areas
              )
                .split(",")
                .map(function (area) {
                  return area.trim();
                })
                .filter(Boolean);


            if (
              !areas.length
            ) {
              return;
            }


            const answer =
              areas[0];


            questions.push(
              makeQuestion(
                "area-" +
                  language.language,

                "medium",

                "Which of these is listed as " +
                  "a principal area for " +
                  language.language +
                  "?",

                answer,

                createOptions(
                  answer,
                  allAreas,
                  4
                ),

                language.language +
                  " is associated with " +
                  language.areas +
                  ".",

                "Geographic distribution"
              )
            );
          }
        );
    }


    /* ============================================================
       STATE / UT C-16 QUESTIONS
       ============================================================ */

    Object.entries(
      states
    ).forEach(
      function (entry) {

        const stateId =
          entry[0];

        const stateData =
          entry[1];


        if (
          !stateData
        ) {
          return;
        }


        const stateName =
          stateData.displayName ||
          stateData.censusUnit2011 ||
          stateId;


        const stateLanguages =
          Array.isArray(
            stateData.languages
          )
            ? stateData.languages.filter(
                function (language) {
                  return (
                    language &&
                    language.name &&
                    Number.isFinite(
                      Number(
                        language.speakers
                      )
                    )
                  );
                }
              )
            : [];


        if (
          stateLanguages.length < 2
        ) {
          return;
        }


        const sorted =
          stateLanguages
            .slice()
            .sort(
              function (a, b) {
                return (
                  Number(b.speakers) -
                  Number(a.speakers)
                );
              }
            );


        const stateLanguageNames =
          sorted.map(
            function (language) {
              return language.name;
            }
          );


        /* --------------------------------------------------------
           Largest language in the State / UT
           -------------------------------------------------------- */

        const leader =
          sorted[0];


        if (
          leader
        ) {

          questions.push(
            makeQuestion(
              "state-leader-" +
                stateId,

              "medium",

              "Which language has the most " +
                "reported mother-tongue speakers " +
                "in " +
                stateName +
                "?",

              leader.name,

              createOptions(
                leader.name,
                stateLanguageNames,
                4
              ),

              leader.name +
                " is ranked #1 in the supplied " +
                "state-level C-16 data for " +
                stateName +
                ", with " +
                formatNumber(
                  leader.speakers
                ) +
                " speakers.",

              "State / UT demographics"
            )
          );
        }


        /* --------------------------------------------------------
           State ranking questions
           -------------------------------------------------------- */

        sorted
          .slice(
            0,
            Math.min(
              sorted.length,
              30
            )
          )
          .forEach(
            function (
              language,
              index
            ) {

              questions.push(
                makeQuestion(
                  "state-rank-" +
                    stateId +
                    "-" +
                    language.name,

                  index < 5
                    ? "medium"
                    : "hard",

                  "Which language is ranked #" +
                    (index + 1) +
                    " among the supplied C-16 " +
                    "language groups for " +
                    stateName +
                    "?",

                  language.name,

                  createOptions(
                    language.name,
                    stateLanguageNames,
                    4
                  ),

                  language.name +
                    " is ranked #" +
                    (index + 1) +
                    " in the supplied " +
                    "state-level C-16 data for " +
                    stateName +
                    ".",

                  "State / UT demographics"
                )
              );
            }
          );


        /* --------------------------------------------------------
           State population share
           -------------------------------------------------------- */

        sorted
          .filter(
            function (language) {
              return Number.isFinite(
                Number(
                  language.statePct
                )
              );
            }
          )
          .slice(
            0,
            40
          )
          .forEach(
            function (language) {

              const value =
                Number(
                  language.statePct
                );


              const answer =
                formatPercent(
                  value,
                  1
                );


              questions.push(
                makeQuestion(
                  "state-share-" +
                    stateId +
                    "-" +
                    language.name,

                  "medium",

                  "What is the approximate " +
                    "state-population share shown " +
                    "for " +
                    language.name +
                    " in " +
                    stateName +
                    "?",

                  answer,

                  shuffle([
                    answer,
                    formatPercent(
                      value + 1.5,
                      1
                    ),
                    formatPercent(
                      Math.max(
                        0,
                        value - 1.5
                      ),
                      1
                    ),
                    formatPercent(
                      value + 3,
                      1
                    )
                  ]),

                  language.name +
                    " is shown at " +
                    answer +
                    " of " +
                    stateName +
                    "'s population in the supplied C-16 extract.",

                  "State population share"
                )
              );
            }
          );


        /* --------------------------------------------------------
           Rural / Urban
           -------------------------------------------------------- */

        sorted
          .filter(
            function (language) {

              return (
                language.rural &&
                language.urban &&
                Number.isFinite(
                  Number(
                    language.rural.pct
                  )
                ) &&
                Number.isFinite(
                  Number(
                    language.urban.pct
                  )
                )
              );
            }
          )
          .slice(
            0,
            40
          )
          .forEach(
            function (language) {

              const rural =
                Number(
                  language.rural.pct
                );

              const urban =
                Number(
                  language.urban.pct
                );


              const answer =
                rural >= urban
                  ? "Rural"
                  : "Urban";


              questions.push(
                makeQuestion(
                  "settlement-" +
                    stateId +
                    "-" +
                    language.name,

                  "medium",

                  "Where does " +
                    language.name +
                    " have the larger " +
                    "share of speakers in " +
                    stateName +
                    "?",

                  answer,

                  [
                    "Rural",
                    "Urban"
                  ],

                  language.name +
                    " has a Rural share of " +
                    formatPercent(
                      rural,
                      1
                    ) +
                    " and an Urban share of " +
                    formatPercent(
                      urban,
                      1
                    ) +
                    " in " +
                    stateName +
                    ".",

                  "Rural / Urban"
                )
              );
            }
          );


        /* --------------------------------------------------------
           Sex ratio
           -------------------------------------------------------- */

        sorted
          .filter(
            function (language) {

              return Number.isFinite(
                Number(
                  language.femalePer1000Male
                )
              );
            }
          )
          .slice(
            0,
            40
          )
          .forEach(
            function (language) {

              const ratio =
                Number(
                  language.femalePer1000Male
                );


              const answer =
                ratio.toFixed(1);


              questions.push(
                makeQuestion(
                  "sex-ratio-" +
                    stateId +
                    "-" +
                    language.name,

                  "hard",

                  "What female-per-1,000-male " +
                    "ratio is shown for " +
                    language.name +
                    " in " +
                    stateName +
                    "?",

                  answer,

                  [
                    answer,
                    (
                      ratio + 35
                    ).toFixed(1),
                    (
                      Math.max(
                        0,
                        ratio - 35
                      )
                    ).toFixed(1),
                    (
                      ratio + 75
                    ).toFixed(1)
                  ],

                  language.name +
                    " is shown with a " +
                    "female-per-1,000-male ratio " +
                    "of " +
                    answer +
                    " in " +
                    stateName +
                    ".",

                  "Sex ratio"
                )
              );
            }
          );


        /* --------------------------------------------------------
           C-16 VARIETIES
           -------------------------------------------------------- */

        sorted
          .filter(
            function (language) {

              return (
                Array.isArray(
                  language.varieties
                ) &&
                language.varieties.length >= 2
              );
            }
          )
          .slice(
            0,
            25
          )
          .forEach(
            function (language) {

              const varieties =
                language.varieties
                  .filter(
                    function (variety) {
                      return (
                        variety &&
                        variety.name
                      );
                    }
                  );


              if (
                varieties.length < 2
              ) {
                return;
              }


              const ordered =
                varieties
                  .slice()
                  .sort(
                    function (a, b) {
                      return (
                        Number(
                          b.speakers
                        ) -
                        Number(
                          a.speakers
                        )
                      );
                    }
                  );


              const largest =
                ordered[0];


              questions.push(
                makeQuestion(
                  "variety-" +
                    stateId +
                    "-" +
                    language.name,

                  "hard",

                  "Which C-16 variety listed under " +
                    language.name +
                    " in " +
                    stateName +
                    " has the largest reported " +
                    "speaker count?",

                  largest.name,

                  createOptions(
                    largest.name,
                    varieties.map(
                      function (v) {
                        return v.name;
                      }
                    ),
                    4
                  ),

                  largest.name +
                    " has the largest reported " +
                    "speaker count among the varieties " +
                    "listed under " +
                    language.name +
                    " for " +
                    stateName +
                    ".",

                  "C-16 varieties"
                )
              );
            }
          );
      }
    );


    /* ============================================================
       CROSS-STATE LANGUAGE QUESTIONS
       ============================================================ */

    const appearances =
      new Map();


    Object.entries(
      states
    ).forEach(
      function (entry) {

        const stateId =
          entry[0];

        const stateData =
          entry[1];


        const stateName =
          stateData.displayName ||
          stateData.censusUnit2011 ||
          stateId;


        const languagesInState =
          Array.isArray(
            stateData.languages
          )
            ? stateData.languages
            : [];


        languagesInState.forEach(
          function (language) {

            if (
              !language ||
              !language.name
            ) {
              return;
            }


            if (
              !appearances.has(
                language.name
              )
            ) {

              appearances.set(
                language.name,
                []
              );
            }


            appearances
              .get(
                language.name
              )
              .push({
                state: stateName,
                speakers:
                  Number(
                    language.speakers
                  ) || 0
              });
          }
        );
      }
    );


    appearances.forEach(
      function (
        entries,
        languageName
      ) {

        if (
          entries.length < 2
        ) {
          return;
        }


        const ordered =
          entries
            .slice()
            .sort(
              function (a, b) {
                return (
                  b.speakers -
                  a.speakers
                );
              }
            );


        const leader =
          ordered[0];


        questions.push(
          makeQuestion(
            "cross-state-" +
              languageName,

            "hard",

            "In which State/UT does " +
              languageName +
              " have the largest reported " +
              "speaker count among the supplied " +
              "state-level extracts?",

            leader.state,

            createOptions(
              leader.state,
              entries.map(
                function (entry) {
                  return entry.state;
                }
              ),
              4
            ),

            languageName +
              " has its largest reported " +
              "speaker count in " +
              leader.state +
              " among the supplied state-level " +
              "C-16 extracts.",

            "Cross-state comparison"
          )
        );
      }
    );


    /* ============================================================
       LANGUAGE-TO-LANGUAGE COMPARISONS
       ============================================================ */

    /*
     * Generate a large number of comparison questions dynamically.
     *
     * This is important for long-term variety.
     */

    const comparisonLimit =
      Math.min(
        ranked.length,
        121
      );


    for (
      let i = 0;
      i < comparisonLimit;
      i++
    ) {

      for (
        let j = i + 1;
        j < comparisonLimit;
        j++
      ) {

        /*
         * Keep the pool large without generating an unnecessarily
         * huge JavaScript object in memory.
         */

        if (
          (i + j) % 3 !== 0
        ) {
          continue;
        }


        const first =
          ranked[i];

        const second =
          ranked[j];


        const answer =
          Number(
            first.speakers
          ) >=
          Number(
            second.speakers
          )
            ? first.language
            : second.language;


        questions.push(
          makeQuestion(
            "comparison-" +
              first.language +
              "-" +
              second.language,

            "easy",

            "Which has more reported " +
              "mother-tongue speakers: " +
              first.language +
              " or " +
              second.language +
              "?",

            answer,

            [
              first.language,
              second.language
            ],

            answer +
              " has the larger reported " +
              "speaker count in the national dataset.",

            "Language comparison"
          )
        );
      }
    }


    /* ============================================================
       REMOVE DUPLICATES / INVALID QUESTIONS
       ============================================================ */

    const seen =
      new Set();


    return questions.filter(
      function (item) {

        if (
          !item ||
          !item.key
        ) {
          return false;
        }


        if (
          seen.has(
            item.key
          )
        ) {
          return false;
        }


        if (
          !Array.isArray(
            item.options
          ) ||
          item.options.length < 2
        ) {
          return false;
        }


        if (
          !item.options.includes(
            item.answer
          )
        ) {
          return false;
        }


        seen.add(
          item.key
        );

        return true;
      }
    );
  }


  /* ============================================================
     QUIZ HOME SCREEN
     ============================================================ */

  function renderQuizHome() {

    const chart =
      document.querySelector(
        ".i121-chart"
      );


    if (!chart) {
      return;
    }


    chart.innerHTML = `

      <div class="i121-quiz">

        <div class="i121-quiz-head">

          <div>

            <div class="i121-quiz-title">
              India Languages Quiz
            </div>

            <div class="i121-quiz-sub">
              Test your knowledge of India's
              linguistic landscape using the
              data in this explorer.
            </div>

          </div>

        </div>


        <div class="i121-quiz-card">

          <div class="i121-quiz-meta">

            <span class="i121-quiz-chip">
              Census of India 2011
            </span>

            <span class="i121-quiz-chip">
              Client-side
            </span>

            <span class="i121-quiz-chip">
              No login
            </span>

          </div>


          <div
            style="
              font-weight:750;
              margin-bottom:10px;
            "
          >
            Difficulty
          </div>


          <div class="i121-quiz-controls">

            <button
              type="button"
              class="i121-quiz-btn"
              data-q-difficulty="easy"
            >
              Easy
            </button>


            <button
              type="button"
              class="i121-quiz-btn"
              data-q-difficulty="medium"
            >
              Medium
            </button>


            <button
              type="button"
              class="i121-quiz-btn active"
              data-q-difficulty="mixed"
            >
              Mixed
            </button>

          </div>


          <div
            style="
              font-weight:750;
              margin:18px 0 10px;
            "
          >
            Number of questions
          </div>


          <div class="i121-quiz-controls">

            <button
              type="button"
              class="i121-quiz-btn"
              data-q-length="5"
            >
              5
            </button>


            <button
              type="button"
              class="i121-quiz-btn active"
              data-q-length="10"
            >
              10
            </button>


            <button
              type="button"
              class="i121-quiz-btn"
              data-q-length="20"
            >
              20
            </button>

          </div>


          <button
            type="button"
            class="i121-quiz-btn active"
            id="i121-quiz-start"
            style="margin-top:20px"
          >
            Start Quiz
          </button>


          <div class="i121-quiz-note">
            Questions are generated locally from
            the existing language and C-16 datasets.
          </div>

        </div>

      </div>
    `;


    document
      .querySelectorAll(
        "[data-q-difficulty]"
      )
      .forEach(
        function (button) {

          button.addEventListener(
            "click",
            function () {

              document
                .querySelectorAll(
                  "[data-q-difficulty]"
                )
                .forEach(
                  function (item) {
                    item.classList.remove(
                      "active"
                    );
                  }
                );


              button.classList.add(
                "active"
              );


              quizState.difficulty =
                button.dataset.qDifficulty;
            }
          );
        }
      );


    document
      .querySelectorAll(
        "[data-q-length]"
      )
      .forEach(
        function (button) {

          button.addEventListener(
            "click",
            function () {

              document
                .querySelectorAll(
                  "[data-q-length]"
                )
                .forEach(
                  function (item) {
                    item.classList.remove(
                      "active"
                    );
                  }
                );


              button.classList.add(
                "active"
              );


              quizState.total =
                Number(
                  button.dataset.qLength
                );
            }
          );
        }
      );


    const startButton =
      document.getElementById(
        "i121-quiz-start"
      );


    if (
      startButton
    ) {

      startButton.addEventListener(
        "click",
        startQuiz
      );
    }
  }


  /* ============================================================
     START QUIZ
     ============================================================ */

  function startQuiz() {

    const questionPool =
      buildQuestionPool();


    if (
      !questionPool.length
    ) {

      renderQuizError(
        "The quiz could not access the language data used by the application."
      );

      return;
    }


    let candidates =
      questionPool;


    /*
     * Filter by requested difficulty.
     *
     * If there are not enough questions in the requested
     * difficulty, use the available questions rather than
     * fabricating new ones.
     */

    if (
      quizState.difficulty !==
      "mixed"
    ) {

      const filtered =
        questionPool.filter(
          function (question) {
            return (
              question.difficulty ===
              quizState.difficulty
            );
          }
        );


      if (
        filtered.length
      ) {

        candidates =
          filtered;
      }
    }


    quizState.questions =
      shuffle(
        candidates
      ).slice(
        0,
        quizState.total
      );


    quizState.index =
      0;

    quizState.score =
      0;

    quizState.answered =
      false;


    renderQuizQuestion();
  }


  /* ============================================================
     QUESTION SCREEN
     ============================================================ */

  function renderQuizQuestion() {

    const chart =
      document.querySelector(
        ".i121-chart"
      );


    if (!chart) {
      return;
    }


    const question =
      quizState.questions[
        quizState.index
      ];


    if (
      !question
    ) {

      renderQuizResult();

      return;
    }


    const progress =
      (
        quizState.index /
        quizState.questions.length
      ) *
      100;


    chart.innerHTML = `

      <div class="i121-quiz">

        <div class="i121-quiz-head">

          <div>

            <div class="i121-quiz-title">
              India Languages Quiz
            </div>

            <div class="i121-quiz-sub">
              Question
              ${quizState.index + 1}
              of
              ${quizState.questions.length}
              · Score
              ${quizState.score}
            </div>

          </div>

        </div>


        <div class="i121-quiz-card">


          <div class="i121-quiz-meta">

            <span class="i121-quiz-chip">
              ${escapeHTML(
                question.category
              )}
            </span>


            <span class="i121-quiz-chip">
              ${escapeHTML(
                question.difficulty
              )}
            </span>

          </div>


          <div class="i121-quiz-progress">

            <span
              style="
                width:${progress}%;
              "
            ></span>

          </div>


          <div class="i121-quiz-q">
            ${escapeHTML(
              question.text
            )}
          </div>


          <div class="i121-quiz-options">

            ${question.options
              .map(
                function (option) {

                  return `
                    <button
                      type="button"
                      class="i121-quiz-option"
                      data-answer="${escapeHTML(
                        option
                      )}"
                    >
                      ${escapeHTML(
                        option
                      )}
                    </button>
                  `;
                }
              )
              .join("")}

          </div>


          <div
            id="i121-quiz-feedback"
          ></div>


        </div>

      </div>
    `;


    document
      .querySelectorAll(
        ".i121-quiz-option"
      )
      .forEach(
        function (button) {

          button.addEventListener(
            "click",
            function () {

              answerQuestion(
                button,
                question
              );
            }
          );
        }
      );
  }


  /* ============================================================
     ANSWER
     ============================================================ */

  function answerQuestion(
    button,
    question
  ) {

    if (
      quizState.answered
    ) {
      return;
    }


    quizState.answered =
      true;


    const selected =
      String(
        button.dataset.answer
      );


    const correct =
      selected ===
      String(
        question.answer
      );


    if (
      correct
    ) {

      quizState.score++;
    }


    document
      .querySelectorAll(
        ".i121-quiz-option"
      )
      .forEach(
        function (option) {

          option.disabled =
            true;


          if (
            String(
              option.dataset.answer
            ) ===
            String(
              question.answer
            )
          ) {

            option.classList.add(
              "correct"
            );

          } else if (
            option === button
          ) {

            option.classList.add(
              "wrong"
            );
          }
        }
      );


    const feedback =
      document.getElementById(
        "i121-quiz-feedback"
      );


    if (!feedback) {
      return;
    }


    feedback.innerHTML = `

      <div class="i121-quiz-feedback">

        <strong>
          ${
            correct
              ? "Correct!"
              : "Not quite."
          }
        </strong>


        ${
          correct
            ? ""
            : `
              The correct answer is
              <strong>
                ${escapeHTML(
                  question.answer
                )}
              </strong>.
            `
        }


        <div
          style="
            margin-top:5px;
          "
        >
          ${escapeHTML(
            question.explanation
          )}
        </div>

      </div>


      <button
        type="button"
        class="i121-quiz-btn i121-quiz-next"
        id="i121-quiz-next"
      >

        ${
          quizState.index + 1 ===
          quizState.questions.length
            ? "See Result"
            : "Next Question"
        }

      </button>
    `;


    const nextButton =
      document.getElementById(
        "i121-quiz-next"
      );


    if (
      nextButton
    ) {

      nextButton.addEventListener(
        "click",
        function () {

          quizState.index++;

          quizState.answered =
            false;

          renderQuizQuestion();
        }
      );
    }
  }


  /* ============================================================
     RESULT SCREEN
     ============================================================ */

  function renderQuizResult() {

    const chart =
      document.querySelector(
        ".i121-chart"
      );


    if (!chart) {
      return;
    }


    const total =
      quizState.questions.length;


    const percentage =
      total
        ? Math.round(
            (
              quizState.score /
              total
            ) *
            100
          )
        : 0;


    let message;


    if (
      percentage >= 90
    ) {

      message =
        "Outstanding knowledge of India's linguistic landscape.";

    } else if (
      percentage >= 70
    ) {

      message =
        "Great work — you know your Indian language data.";

    } else if (
      percentage >= 50
    ) {

      message =
        "Good start. There are plenty more rabbit holes to explore.";

    } else {

      message =
        "Keep exploring — the data has plenty of surprises.";
    }


    chart.innerHTML = `

      <div class="i121-quiz">

        <div
          class="
            i121-quiz-card
            i121-quiz-result
          "
        >

          <div class="i121-quiz-title">
            Quiz Complete
          </div>


          <div class="i121-quiz-score">
            ${quizState.score}/${total}
          </div>


          <div
            style="
              font-weight:700;
            "
          >
            ${percentage}%
          </div>


          <div
            style="
              margin-top:8px;
            "
          >
            ${escapeHTML(
              message
            )}
          </div>


          <div class="i121-quiz-actions">


            <button
              type="button"
              class="i121-quiz-btn active"
              id="i121-quiz-again"
            >
              Play Again
            </button>


            <button
              type="button"
              class="i121-quiz-btn"
              id="i121-quiz-home"
            >
              Quiz Home
            </button>


            <button
              type="button"
              class="i121-quiz-btn"
              id="i121-quiz-share"
            >
              Share Score
            </button>


          </div>


          <div class="i121-quiz-note">
            Your score is calculated locally
            in your browser.
          </div>

        </div>

      </div>
    `;


    document
      .getElementById(
        "i121-quiz-again"
      )
      .addEventListener(
        "click",
        startQuiz
      );


    document
      .getElementById(
        "i121-quiz-home"
      )
      .addEventListener(
        "click",
        renderQuizHome
      );


    document
      .getElementById(
        "i121-quiz-share"
      )
      .addEventListener(
        "click",
        shareScore
      );
  }


  /* ============================================================
     SHARE SCORE
     ============================================================ */

  async function shareScore() {

    const total =
      quizState.questions.length;


    const text =
      "I scored " +
      quizState.score +
      "/" +
      total +
      " on the India Languages Quiz!";


    /*
     * Native mobile sharing.
     */

    if (
      navigator.share
    ) {

      try {

        await navigator.share({
          title:
            "India Languages Quiz",

          text:
            text,

          url:
            window.location.href
        });


        return;

      } catch (
        error
      ) {

        /*
         * The user may simply have cancelled
         * the share sheet.
         */
      }
    }


    /*
     * Clipboard fallback.
     */

    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {

      try {

        await navigator.clipboard.writeText(
          text +
          " " +
          window.location.href
        );


        alert(
          "Score copied to clipboard."
        );


        return;

      } catch (
        error
      ) {}
    }


    /*
     * Final fallback.
     */

    window.prompt(
      "Copy your result:",
      text +
      " " +
      window.location.href
    );
  }


  /* ============================================================
     ERROR SCREEN
     ============================================================ */

  function renderQuizError(
    message
  ) {

    const chart =
      document.querySelector(
        ".i121-chart"
      );


    if (!chart) {
      return;
    }


    chart.innerHTML = `

      <div class="i121-quiz">

        <div
          class="
            i121-quiz-card
            i121-quiz-result
          "
        >

          <div class="i121-quiz-title">
            Quiz Unavailable
          </div>


          <div
            style="
              margin-top:8px;
            "
          >
            ${escapeHTML(
              message
            )}
          </div>


          <div class="i121-quiz-note">
            Please refresh the page and try again.
          </div>

        </div>

      </div>
    `;
  }


  /* ============================================================
     PUBLIC API
     ============================================================ */

  /*
   * index.html calls this when Quiz view is selected.
   */

  window.renderQuizHome =
    renderQuizHome;


  /*
   * Optional public API.
   */

  window.I121Quiz = {

    home:
      renderQuizHome,

    start:
      startQuiz,

    buildQuestionPool:
      buildQuestionPool
  };


})();
