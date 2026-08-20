import { useCallback, useEffect, useMemo, useState } from 'react';

import { COPY } from '@/config/copy';
import { ApiError, CLIENT_ERROR_CODES, api } from '@/services/api';
import {
  AREAS,
  STORAGE_KEYS,
  mergeNamespaced,
  readNamespaced,
  writeNamespaced,
} from '@/services/storage';
import {
  QuestionField,
  emptyAnswer,
  isAnswered,
} from '@/components/dom/questionnaire/QuestionField';

const DRAFT_NAMESPACE = 'questionnaire';

const PHASES = Object.freeze({
  LOADING: 'loading',
  READY: 'ready',
  CLOSED: 'closed',
  SENT: 'sent',
});

const explain = (error) => {
  if (!(error instanceof ApiError)) return COPY.QUESTIONNAIRE.UNAVAILABLE;
  if (error.code === CLIENT_ERROR_CODES.NETWORK) return COPY.QUESTIONNAIRE.OFFLINE;
  if (error.code === CLIENT_ERROR_CODES.TIMEOUT) return COPY.QUESTIONNAIRE.SLOW;
  if (error.status === 429) return COPY.QUESTIONNAIRE.TOO_MANY;
  if (error.status === 409) return COPY.QUESTIONNAIRE.ALREADY_SENT;
  if (error.status === 400 || error.status === 422) return COPY.QUESTIONNAIRE.REFUSED;
  return COPY.QUESTIONNAIRE.UNAVAILABLE;
};

const groupBySection = (questions, sections) => {
  const declared = Array.isArray(sections) ? sections : [];
  if (declared.length === 0) {
    return [{ key: 'all', title: null, description: null, questions }];
  }

  const known = new Set(declared.map((section) => section.key));
  const groups = declared.map((section) => ({
    key: section.key,
    title: section.title,
    description: section.description ?? null,
    questions: [],
  }));

  for (const question of questions) {
    const index = known.has(question.section)
      ? groups.findIndex((group) => group.key === question.section)
      : 0;
    groups[index].questions.push(question);
  }

  return groups.filter((group) => group.questions.length > 0);
};

const toWire = (questionId, answer) => {
  if (!isAnswered(answer)) return null;
  const wire = { questionId };
  const text = typeof answer.text === 'string' ? answer.text.trim() : '';
  if (text !== '') wire.text = text;
  if (Number.isInteger(answer.rating)) wire.rating = answer.rating;
  if (Array.isArray(answer.values) && answer.values.length > 0) wire.values = answer.values;
  return wire;
};

export const QuestionnaireForm = ({ readingFormat = null, onComplete, continueLabel }) => {
  const [phase, setPhase] = useState(PHASES.LOADING);
  const [questionnaire, setQuestionnaire] = useState(null);
  const [failure, setFailure] = useState(null);
  const [busy, setBusy] = useState(false);

  const [answers, setAnswers] = useState(
    () => readNamespaced(AREAS.SESSION, STORAGE_KEYS.SESSION, DRAFT_NAMESPACE) ?? {},
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await api.getActiveQuestionnaire();
        if (cancelled) return;
        if (result?.questionnaire) {
          setQuestionnaire(result.questionnaire);
          setPhase(PHASES.READY);
        } else {
          setPhase(PHASES.CLOSED);
        }
      } catch (thrown) {
        if (cancelled) return;
        setFailure(thrown);
        setPhase(PHASES.CLOSED);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    mergeNamespaced(AREAS.SESSION, STORAGE_KEYS.SESSION, DRAFT_NAMESPACE, answers);
  }, [answers]);

  const onChange = useCallback((questionId, value) => {
    setAnswers((previous) => ({ ...previous, [questionId]: value }));
  }, []);

  const questions = useMemo(
    () =>
      (Array.isArray(questionnaire?.questions) ? [...questionnaire.questions] : []).sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      ),
    [questionnaire],
  );

  const groups = useMemo(
    () => groupBySection(questions, questionnaire?.sections),
    [questions, questionnaire],
  );

  const answeredCount = useMemo(
    () => questions.filter((question) => isAnswered(answers[question.questionId])).length,
    [questions, answers],
  );

  const missingRequired = useMemo(
    () =>
      questions.some(
        (question) => question.required && !isAnswered(answers[question.questionId]),
      ),
    [questions, answers],
  );

  const onSubmit = useCallback(
    async (event) => {
      event?.preventDefault?.();
      setBusy(true);
      setFailure(null);
      try {
        const payload = questions
          .map((question) => toWire(question.questionId, answers[question.questionId]))
          .filter(Boolean);

        await api.submitQuestionnaire({
          questionnaireId: questionnaire.questionnaireId,
          answers: payload,
          ...(readingFormat ? { readingFormat } : {}),
        });

        setAnswers({});
        writeNamespaced(AREAS.SESSION, STORAGE_KEYS.SESSION, DRAFT_NAMESPACE, {});
        setPhase(PHASES.SENT);
      } catch (thrown) {
        setFailure(thrown);
      } finally {
        setBusy(false);
      }
    },
    [questions, answers, questionnaire, readingFormat],
  );

  const onward = onComplete ? (
    <button type="button" className="ogp-invitation" onClick={onComplete}>
      {continueLabel ?? COPY.COMPLETE.CONTINUE}
    </button>
  ) : null;

  if (phase === PHASES.SENT) {
    return (
      <div className="ogp-questionnaire__column ogp-questionnaire__column--centred">
        <p className="ogp-questionnaire__confirmation" role="status">
          {COPY.QUESTIONNAIRE.CONFIRMATION}
        </p>
        {onward}
      </div>
    );
  }

  if (phase === PHASES.LOADING) {
    return (
      <div className="ogp-questionnaire__column ogp-questionnaire__column--centred">
        <p className="ogp-questionnaire__notice" role="status">
          {COPY.QUESTIONNAIRE.LOADING}
        </p>
      </div>
    );
  }

  if (phase === PHASES.CLOSED) {
    return (
      <div className="ogp-questionnaire__column ogp-questionnaire__column--centred">
        <p className="ogp-questionnaire__notice" role="status">
          {failure ? explain(failure) : COPY.QUESTIONNAIRE.CLOSED}
        </p>
        {onward}
      </div>
    );
  }

  const unanswered = questions.length - answeredCount;

  return (
    <form className="ogp-questionnaire__column" onSubmit={onSubmit} noValidate>
      <header className="ogp-questionnaire__masthead">
        {questionnaire.title ? (
          <h1 className="ogp-questionnaire__title">{questionnaire.title}</h1>
        ) : null}
        {questionnaire.purpose ? (
          <p className="ogp-questionnaire__intro">{questionnaire.purpose}</p>
        ) : null}
        {questionnaire.instruction ? (
          <p className="ogp-questionnaire__intro">{questionnaire.instruction}</p>
        ) : null}
        {questionnaire.scaleLegend ? (
          <p className="ogp-questionnaire__intro">{questionnaire.scaleLegend}</p>
        ) : null}
        <p className="ogp-questionnaire__intro ogp-questionnaire__intro--quiet">
          {COPY.QUESTIONNAIRE.DRAFT_KEPT}
        </p>
      </header>

      {groups.map((group) => (
        <section className="ogp-questionnaire__section" key={group.key}>
          {group.title ? (
            <h2 className="ogp-questionnaire__section-title">{group.title}</h2>
          ) : null}
          {group.description ? (
            <p className="ogp-questionnaire__intro">{group.description}</p>
          ) : null}

          {group.questions.map((question) => (
            <QuestionField
              key={question.questionId}
              question={question}
              value={answers[question.questionId] ?? emptyAnswer()}
              onChange={onChange}
            />
          ))}
        </section>
      ))}

      <footer className="ogp-questionnaire__foot">
        <p className="ogp-questionnaire__progress" role="status">
          {unanswered === 0
            ? COPY.QUESTIONNAIRE.ALL_ANSWERED
            : unanswered === 1
              ? COPY.QUESTIONNAIRE.UNANSWERED_ONE
              : COPY.QUESTIONNAIRE.UNANSWERED_MANY.replace('{count}', String(unanswered))}
        </p>

        {failure ? (
          <p className="ogp-questionnaire__problem" role="alert">
            {explain(failure)}
          </p>
        ) : null}

        <button
          type="submit"
          className="ogp-invitation ogp-questionnaire__submit"
          disabled={busy || missingRequired || answeredCount === 0}
        >
          {busy ? COPY.QUESTIONNAIRE.WORKING : COPY.QUESTIONNAIRE.SUBMIT}
        </button>
      </footer>
    </form>
  );
};

export default QuestionnaireForm;
