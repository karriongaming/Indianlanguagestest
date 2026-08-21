(function () {
  "use strict";

  const quizState = {
    difficulty: "mixed",
    total: 10,
    index: 0,
    score: 0,
    questions: [],
    answered: false
  };

  function qData() {
    return Array.isArray(window.DATA)
      ? window.DATA.filter(
          x =>
            x &&
            x.name &&
            Number.isFinite(Number(x.speakers))
        )
      : [];
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[c];
    });
  }

  function fmt(n) {
    return new Intl.NumberFormat("en-IN").format(
      Math.round(Number(n))
    );
  }

  function shuffle(a) {
    a = a.slice();

    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [a[i], a[j]] = [a[j], a[i]];
    }

    return a;
  }

  function sample(a, n) {
    return shuffle(a).slice(0, n);
  }

  function unique(a) {
    return [...new Set(a.filter(Boolean).map(String))];
  }

  function options(correct, pool) {
    const alternatives = unique(pool).filter(
      x => x !== String(correct)
    );

    return shuffle([
      String(correct),
      ...sample(alternatives, 3)
    ]);
  }

  /*
   * Build the question bank from the existing DATA object
   * already used by the main application.
   */
  function buildQuizBank() {
    const d = qData();

    if (d.length < 4) {
      return [];
    }

    const ranked = d
      .slice()
      .sort(
        (a, b) =>
          Number(b.speakers) - Number(a.speakers)
      );

    const bank = [];

    /*
     * NATIONAL RANKING QUESTIONS
     */
    ranked.slice(0, 25).forEach(function (x, i) {
      bank.push({
        key: "rank:" + x.name,

        difficulty:
          i < 5 ? "easy" : "medium",

        text:
          `Which language ranks #${i + 1} in India ` +
          `by mother-tongue speakers in this explorer?`,

        answer: x.name,

        options: options(
          x.name,
          d.map(y => y.name)
        ),

        explanation:
          `${x.name} has ${fmt(
            x.speakers
          )} recorded speakers.`
      });
    });

    /*
     * SPEAKER COUNT QUESTIONS
     */
    sample(ranked, 35).forEach(function (x) {
      bank.push({
        key: "count:" + x.name,

        difficulty: "medium",

        text:
          `Which language has approximately ` +
          `${fmt(
            x.speakers
          )} mother-tongue speakers in India?`,

        answer: x.name,

        options: options(
          x.name,
          d.map(y => y.name)
        ),

        explanation:
          `The dataset records ${fmt(
            x.speakers
          )} speakers for ${x.name}.`
      });
    });

    /*
     * LANGUAGE FAMILY QUESTIONS
     */
    const families = unique(
      d.map(x => x.family || "Unknown")
    );

    d.forEach(function (x) {
      bank.push({
        key: "family:" + x.name,

        difficulty: "easy",

        text:
          `Which language family is ${x.name} ` +
          `classified under?`,

        answer: x.family || "Unknown",

        options: options(
          x.family || "Unknown",
          families
        ),

        explanation:
          `${x.name} is classified as ` +
          `${x.family || "Unknown"}.`
      });
    });

    /*
     * SCHEDULED / NON-SCHEDULED QUESTIONS
     */
    const statuses = unique(
      d.map(x =>
        x.scheduled
          ? "Scheduled"
          : "Non-Scheduled"
      )
    );

    if (statuses.length > 1) {
      d.forEach(function (x) {
        const answer = x.scheduled
          ? "Scheduled"
          : "Non-Scheduled";

        bank.push({
          key: "status:" + x.name,

          difficulty: "easy",

          text:
            `What is the Scheduled status of ` +
            `${x.name}?`,

          answer: answer,

          options: options(
            answer,
            statuses
          ),

          explanation:
            `${x.name} is marked ${answer}.`
        });
      });
    }

    /*
     * NATIONAL POPULATION SHARE QUESTIONS
     */
    d
      .filter(x =>
        Number.isFinite(Number(x.pct))
      )
      .forEach(function (x) {
        const p = Number(x.pct);

        const answer =
          p.toFixed(1) + "%";

        bank.push({
          key: "pct:" + x.name,

          difficulty: "medium",

          text:
            `Approximately what percentage of India's ` +
            `population is represented by ${x.name} ` +
            `in this explorer?`,

          answer: answer,

          options: shuffle([
            answer,
            (p + 1.7).toFixed(1) + "%",
            Math.max(
              0,
              p - 1.9
            ).toFixed(1) + "%",
            (p + 3.1).toFixed(1) + "%"
          ]),

          explanation:
            `The recorded share is approximately ${answer}.`
        });
      });

    /*
     * LANGUAGE VS LANGUAGE COMPARISONS
     */
    for (let i = 0; i < 80; i++) {
      const pair = sample(ranked, 2);

      const a = pair[0];
      const b = pair[1];

      if (!a || !b) {
        break;
      }

      const answer =
        Number(a.speakers) >=
        Number(b.speakers)
          ? a.name
          : b.name;

      bank.push({
        key:
          "compare:" +
          a.name +
          ":" +
          b.name,

        difficulty: "easy",

        text:
          `Which has more mother-tongue speakers in India: ` +
          `${a.name} or ${b.name}?`,

        answer: answer,

        options: shuffle([
          a.name,
          b.name
        ]),

        explanation:
          `${answer} has the larger recorded ` +
          `speaker count.`
      });
    }

    return bank;
  }

  /*
   * QUIZ HOME
   */
  function renderQuizHome() {
    const chart =
      document.getElementById("chart");

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

          <div
            style="
              font-weight:750;
              margin-bottom:10px
            "
          >
            Choose difficulty
          </div>

          <div class="i121-quiz-controls">

            <button
              class="i121-quiz-btn"
              data-qdiff="easy"
            >
              Easy
            </button>

            <button
              class="i121-quiz-btn"
              data-qdiff="medium"
            >
              Medium
            </button>

            <button
              class="i121-quiz-btn active"
              data-qdiff="mixed"
            >
              Mixed
            </button>

          </div>

          <div
            style="
              font-weight:750;
              margin:18px 0 10px
            "
          >
            Questions
          </div>

          <div class="i121-quiz-controls">

            <button
              class="i121-quiz-btn"
              data-qlen="5"
            >
              5
            </button>

            <button
              class="i121-quiz-btn active"
              data-qlen="10"
            >
              10
            </button>

            <button
              class="i121-quiz-btn"
              data-qlen="20"
            >
              20
            </button>

          </div>

          <button
            class="i121-quiz-btn active"
            id="i121QuizStart"
            style="margin-top:20px"
          >
            Start Quiz
          </button>

          <div class="i121-quiz-note">
            Questions are generated locally from
            the data already contained in this page.
          </div>

        </div>

      </div>
    `;

    document
      .querySelectorAll("[data-qdiff]")
      .forEach(function (button) {

        button.onclick = function () {

          document
            .querySelectorAll("[data-qdiff]")
            .forEach(function (item) {
              item.classList.remove("active");
            });

          button.classList.add("active");

          quizState.difficulty =
            button.dataset.qdiff;
        };
      });

    document
      .querySelectorAll("[data-qlen]")
      .forEach(function (button) {

        button.onclick = function () {

          document
            .querySelectorAll("[data-qlen]")
            .forEach(function (item) {
              item.classList.remove("active");
            });

          button.classList.add("active");

          quizState.total =
            Number(button.dataset.qlen);
        };
      });

    const startButton =
      document.getElementById(
        "i121QuizStart"
      );

    if (startButton) {
      startButton.onclick =
        startQuiz;
    }
  }

  /*
   * START QUIZ
   */
  function startQuiz() {

    let bank = buildQuizBank();

    if (
      quizState.difficulty !==
      "mixed"
    ) {

      const filtered =
        bank.filter(function (q) {
          return (
            q.difficulty ===
            quizState.difficulty
          );
        });

      if (
        filtered.length >=
        quizState.total
      ) {
        bank = filtered;
      }
    }

    quizState.questions =
      shuffle(bank).slice(
        0,
        quizState.total
      );

    quizState.index = 0;
    quizState.score = 0;
    quizState.answered = false;

    renderQuizQuestion();
  }

  /*
   * DISPLAY QUESTION
   */
  function renderQuizQuestion() {

    const chart =
      document.getElementById("chart");

    const q =
      quizState.questions[
        quizState.index
      ];

    if (!q) {
      renderQuizResult();
      return;
    }

    const progress =
      (
        quizState.index /
        quizState.questions.length
      ) * 100;

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

          <div class="i121-quiz-progress">
            <span
              style="
                width:${progress}%
              "
            ></span>
          </div>

          <div class="i121-quiz-q">
            ${esc(q.text)}
          </div>

          <div class="i121-quiz-options">

            ${q.options
              .map(function (option) {

                return `
                  <button
                    class="i121-quiz-option"
                    data-answer="${esc(option)}"
                  >
                    ${esc(option)}
                  </button>
                `;

              })
              .join("")}

          </div>

          <div id="i121QuizFeedback"></div>

        </div>

      </div>
    `;

    document
      .querySelectorAll(
        ".i121-quiz-option"
      )
      .forEach(function (button) {

        button.onclick =
          function () {
            answerQuiz(button, q);
          };

      });
  }

  /*
   * CHECK ANSWER
   */
  function answerQuiz(button, q) {

    if (quizState.answered) {
      return;
    }

    quizState.answered = true;

    const correct =
      String(button.dataset.answer) ===
      String(q.answer);

    if (correct) {
      quizState.score++;
    }

    document
      .querySelectorAll(
        ".i121-quiz-option"
      )
      .forEach(function (item) {

        item.disabled = true;

        if (
          String(item.dataset.answer) ===
          String(q.answer)
        ) {

          item.classList.add(
            "correct"
          );

        } else if (
          item === button
        ) {

          item.classList.add(
            "wrong"
          );

        }

      });

    const feedback =
      document.getElementById(
        "i121QuizFeedback"
      );

    feedback.innerHTML = `

      <div class="i121-quiz-feedback">

        <strong>
          ${correct
            ? "Correct!"
            : "Not quite."}
        </strong>

        ${
          correct
            ? ""
            : `
              The correct answer is
              <strong>
                ${esc(q.answer)}
              </strong>.
            `
        }

        <div style="margin-top:5px">
          ${esc(q.explanation)}
        </div>

      </div>

      <button
        class="i121-quiz-btn i121-quiz-next"
        id="i121QuizNext"
      >
        ${
          quizState.index + 1 ===
          quizState.questions.length
            ? "See Result"
            : "Next Question"
        }
      </button>
    `;

    document.getElementById(
      "i121QuizNext"
    ).onclick = function () {

      quizState.index++;

      quizState.answered = false;

      renderQuizQuestion();
    };
  }

  /*
   * RESULTS
   */
  function renderQuizResult() {

    const total =
      quizState.questions.length;

    const percentage =
      total
        ? Math.round(
            (quizState.score /
              total) *
              100
          )
        : 0;

    let message;

    if (percentage >= 90) {
      message =
        "Outstanding knowledge of India's linguistic landscape.";
    } else if (percentage >= 70) {
      message =
        "Great work — you know your Indian language data.";
    } else if (percentage >= 50) {
      message =
        "Good start. There are plenty more rabbit holes to explore.";
    } else {
      message =
        "Keep exploring — the data has plenty of surprises.";
    }

    document.getElementById(
      "chart"
    ).innerHTML = `

      <div class="i121-quiz">

        <div
          class="
            i121-quiz-card
            i121-quiz-result
          "
        >

          <div class="i121-quiz-title">
            Quiz complete
          </div>

          <div class="i121-quiz-score">
            ${quizState.score}/${total}
          </div>

          <div>
            ${message}
          </div>

          <div class="i121-quiz-actions">

            <button
              class="i121-quiz-btn active"
              id="i121QuizAgain"
            >
              Play Again
            </button>

            <button
              class="i121-quiz-btn"
              id="i121QuizHome"
            >
              Quiz Home
            </button>

            <button
              class="i121-quiz-btn"
              id="i121QuizShare"
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

    document.getElementById(
      "i121QuizAgain"
    ).onclick = startQuiz;

    document.getElementById(
      "i121QuizHome"
    ).onclick = renderQuizHome;

    document.getElementById(
      "i121QuizShare"
    ).onclick = async function () {

      const text =
        `I scored ${quizState.score}/${total} ` +
        `on the India Languages Quiz!`;

      if (navigator.share) {

        try {

          await navigator.share({
            title:
              "India Languages Quiz",
            text: text,
            url: location.href
          });

        } catch (e) {}

      } else if (
        navigator.clipboard
      ) {

        await navigator.clipboard.writeText(
          text + " " + location.href
        );

        alert(
          "Score copied to clipboard."
        );

      } else {

        prompt(
          "Copy your result:",
          text + " " + location.href
        );
      }
    };
  }

  /*
   * Expose functions to index.html
   */
  window.renderQuizHome =
    renderQuizHome;

  window.I121Quiz = {
    home: renderQuizHome,
    start: startQuiz
  };

})();