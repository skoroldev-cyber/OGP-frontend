/**
 * One Global People — the complete inventory of user-facing language.
 *
 * =============================================================================
 *  LOCKED STRINGS ARE CHARACTER-FOR-CHARACTER.
 *  Every string marked LOCKED below is canonical Founder / protected-manuscript
 *  language reproduced exactly, including punctuation, capitalisation, dashes and
 *  trailing periods. Changing so much as a full stop requires FOUNDER CERTIFICATION
 *  (master §1 canonical integrity; BUILD_CONTRACT §1). Do not "improve" them, do not
 *  normalise their punctuation, do not translate them in place.
 *
 *  Strings marked [PROPOSED] are engineering completions awaiting founder lock. They
 *  are still the only place that wording may live — no component may hold a literal.
 *
 *  PROHIBITED VOCABULARY (BUILD_CONTRACT §0.1, src/config/rules.json) never appears
 *  here: join / join now / join us / sign up / become a member / membership / recruit /
 *  convert / enlist / invite people / spread the movement / go viral / share if you care /
 *  humanity depends on you / act now / limited time / be part of history.
 * =============================================================================
 *
 * Grouped by the state that renders the language. `COPY` is deep-frozen: a component
 * that tries to mutate copy fails loudly in development instead of quietly shipping
 * altered protected language.
 */

/**
 * Recursively freeze an object graph so protected language cannot be mutated at runtime.
 *
 * @template T
 * @param {T} value
 * @returns {T}
 */
const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
};

const copy = {
  /* ------------------------------------------------------------------ */
  /* Identity — hidden semantic layer and metadata only (§2.8, §2.13)    */
  /* ------------------------------------------------------------------ */
  META: {
    /** LOCKED. Never visibly rendered inside the opening experience (§8.8). */
    SITE_TAGLINE:
      'Now or never. ONE Global People unites humanity as One Global Family to restore truth, rebuild trust, create accountability, and protect the Shared World.',
    /** LOCKED — book identity, §3.5.2 unit 0. */
    BOOK_TITLE: 'Now or Never',
    BOOK_DASH: '- One',
    BOOK_SUBTITLE: 'The Global Family Unites to Save the World',
    ORGANISATION: 'One Global People',
    /** LOCKED — the public/canonical name of the environment (§3.1). */
    READING_ROOM_NAME: 'Immersive Reading Room',
    /** [PROPOSED] quiet secondary link, never on the first screen. */
    SECONDARY_LANDING_LINK: 'About One Global',
  },

  /* ------------------------------------------------------------------ */
  /* The three mandatory affordances — live from S1 onward (§2.10, §7.9)  */
  /* ------------------------------------------------------------------ */
  AFFORDANCES: {
    /** [PROPOSED] §7.9. Never punishing; lands the reader in the same world. */
    SKIP: 'Skip the opening',
    /** [PROPOSED] §2.8 / §7.9. Silence is a complete experience, not a fallback. */
    CONTINUE_IN_SILENCE: 'Continue in silence',
    /** [PROPOSED] §2.8. The audio opt-in control. Nothing plays until it is used. */
    SOUND: 'Sound',
    /** [PROPOSED] group label for assistive technology. */
    GROUP_LABEL: 'Experience controls',
  },

  /* ------------------------------------------------------------------ */
  /* Hidden accessible labels (§2.7, §3.2 — locked)                      */
  /* ------------------------------------------------------------------ */
  A11Y: {
    /** LOCKED. Semantic label of the S5 entry action, whatever the visible label. */
    HIDDEN_ENTRY_LABEL: 'Begin the Journey into the Immersive Reading Room.',
    /** LOCKED. Semantic label of the S8 invitation. */
    HIDDEN_READING_ROOM_LABEL: 'Enter the Immersive Reading Room.',
    /** [PROPOSED] the canvas is decoration; the DOM tree is the experience (§3.10). */
    CANVAS_DESCRIPTION: 'A visual environment accompanies this text. All content is available as text.',
    /** [PROPOSED] live-region label for state narration. */
    NARRATIVE_REGION_LABEL: 'Experience narration',
    SKIP_TO_READING: 'Skip to the manuscript',
    CLOSE: 'Close',
    BACK: 'Back',
    /** [PROPOSED] dismissal of a one-time orientation hint (§7.3). */
    DISMISS: 'Dismiss',
    /** [PROPOSED] landmark name of the parallel accessible passage during the opening. */
    OPENING_PASSAGE_LABEL: 'Opening passage',
  },

  /* ------------------------------------------------------------------ */
  /* S1–S7 — the opening. No visible language before ~70 s (§2.3).       */
  /* ------------------------------------------------------------------ */
  OPENING: {
    /**
     * LOCKED as the four recognitions the staging must produce, in order (§2.3).
     * Rendered as fading billboards only where the Creative Director places them;
     * they are always available to assistive technology.
     */
    RECOGNITIONS: ['Something is here.', 'It is alive.', 'It includes Earth.', 'It concerns me.'],
    /**
     * LOCKED as protected-language candidate (§8.4.2). SUPERSEDED for visible UI by the
     * terminology lock on "Enter" — do NOT render unless the founder locks it (§2.7).
     */
    THRESHOLD_QUESTION: 'What have we forgotten?',
    /**
     * LOCKED. The S5 threshold action, shown at S4 beneath the question when the founder
     * locks the question (BUILD_CONTRACT §1 label-placement rule). Not a competitor to "Enter".
     */
    THRESHOLD_ACTION: 'Begin the Journey',
    /** LOCKED. The orientation sentence of the Earth reveal. */
    EARTH_REVEAL_SENTENCE:
      'To understand the world, we must understand our relationship to it first.',
  },

  /**
   * Parallel textual narrative for S1–S8 (§7.9, §2.10). Announced politely; never a
   * substitute for the visual, never marketing. Plain description of what is present.
   */
  NARRATIVE: {
    S1: 'The screen is dark. The experience is beginning quietly.',
    S2: 'A single warm point of light has become visible in the distance.',
    S3: 'Fine golden light is gathering into a woven form.',
    S4: 'The woven form holds an opening at its centre. Earth is visible far inside it.',
    S5: 'A short passage has appeared, with an invitation beneath it.',
    S6: 'Moving slowly through the opening.',
    S7: 'Earth is present in full view: atmosphere, ocean, cloud and land.',
    S8: 'The Immersive Reading Room is ready.',
  },

  /* ------------------------------------------------------------------ */
  /* S5 Portal Entry — the first human truth (§2.7)                      */
  /* ------------------------------------------------------------------ */
  PORTAL: {
    /**
     * LOCKED as the functional protected-voice placeholder (BUILD_CONTRACT §1;
     * §2.7 records it as explicitly NOT the final locked text — the Visionary Architect
     * certifies the final passage at Gate 1). Rendered as three lines with hard breaks.
     */
    FIRST_WORDS: [
      'You did not arrive outside this world.',
      'You were born from within it.',
      'You have never been separate from what you are seeing.',
    ],
    /** LOCKED. The Prototype 1 "Return to Earth" candidate passage (§2.7). Two lines. */
    PROTOTYPE_CLOSING: [
      'You are not entering a system.',
      'You are returning to the living source that made you possible.',
    ],
  },

  /* ------------------------------------------------------------------ */
  /* S8 Reading Room Invitation (§3.2)                                   */
  /* ------------------------------------------------------------------ */
  INVITATION: {
    /** LOCKED. The invitation is exactly this word. An invitation, not a button (§8.7). */
    READING_ROOM_INVITATION: 'Enter',
    /** [PROPOSED] §3.2 secondary control — straight to the manuscript, scene receded. */
    TEXT_ONLY_ENTRY: 'Continue with text only',
  },

  /* ------------------------------------------------------------------ */
  /* S9 Reading Room Initialization — age calibration (§3.3, Phase 1B)   */
  /* ------------------------------------------------------------------ */
  AGE: {
    /** LOCKED. */
    ENTRY_MESSAGE:
      'This reading room can adjust the experience so the manuscript is presented in the clearest and most appropriate way for your stage of life.',
    /** LOCKED — the short control label. */
    PROMPT_SHORT: 'Choose your age range.',
    /** LOCKED — the long prompt shown with the options. */
    PROMPT_LONG:
      'Select your age range so the reading experience can be presented in the way most appropriate for you.',
    /** LOCKED — displayed with the prompt, never hidden behind a link. */
    PRIVACY_STATEMENT:
      'Your age range is used only to adjust reading depth, language, and emotional intensity. It is not used to profile you.',
    /**
     * LOCKED band labels — these exact strings are the verbatim routing keys of §3.3
     * ("8-12"→foundation … "33+"→full_manuscript). Display and key are the same string.
     */
    BANDS: ['8-12', '13-16', '17-19', '20-25', '26-32', '33+'],
    /** [PROPOSED] §3.3 no-answer path; routes to full_manuscript. */
    DECLINE: 'Continue without choosing',
  },

  /* ------------------------------------------------------------------ */
  /* S10–S12 Reading (§3.4, §3.9)                                        */
  /* ------------------------------------------------------------------ */
  READING: {
    /** [PROPOSED] the quiet unlabelled-in-spirit continue affordance at unit end (§3.4.2). */
    CONTINUE: 'Continue',
    /** [PROPOSED] return to the previous unit (§3.4.2 ArrowLeft/PageUp). */
    PREVIOUS: 'Previous',
    /** [PROPOSED] landmark label for the manuscript region. */
    MANUSCRIPT_LABEL: 'Manuscript',
    /** [PROPOSED] the floating reading cluster (§3.9 "a single quiet settings affordance"). */
    CONTROLS_LABEL: 'Reading controls',
    /** [PROPOSED] text-size controls. Scalable type is a hard requirement (§3.9, §8.11). */
    TEXT_SMALLER: 'Smaller text',
    TEXT_LARGER: 'Larger text',
    SETTINGS: 'Reading settings',
    /**
     * [PROPOSED] auto-reading. Scrolls WITHIN a unit and stops at its end: §14.4.2 prohibits
     * auto-advancing the reader through the arc on a timer, so crossing a unit boundary stays
     * the reader's act. Any manual scroll stops it.
     */
    AUTO_READ_START: 'Read automatically',
    AUTO_READ_STOP: 'Pause automatic reading',
    AUTO_READ_PACE: 'Reading pace',
    /**
     * [PROPOSED] announced on change, never drawn. A step count is orientation for someone who
     * cannot see the result; on screen the page itself is the confirmation, and a visible
     * counter would be the first step toward the progress mechanics §14.4.1 prohibits.
     */
    TEXT_SIZE_STATUS: 'Text size {step} of {total}',
    /** LOCKED — the authored closing line of the Transition unit (§3.13). */
    TRANSITION_CLOSING_LINE:
      'If you are ready for that clarity, proceed to Chapter 2 — Awareness.',
    /** LOCKED — the single restrained content notice before Chapter 1 (§3.5.2). */
    CONTENT_NOTICE_CH1:
      'The next chapter includes first-person accounts of real harm, including harm to children. Read at your own pace. You may pause at any time.',
    /** [PROPOSED] acknowledgement of a content notice. Never a gate the reader can fail. */
    CONTENT_NOTICE_ACKNOWLEDGE: 'Continue',
    /** [PROPOSED] landmark label for the single restrained notice (§3.5.2). */
    CONTENT_NOTICE_REGION: 'Content notice',
    /**
     * [PROPOSED] the notice's second option (§3.5.2 "pause and skip options"). The pause is
     * the notice itself: it waits indefinitely and nothing advances until the reader acts.
     */
    CONTENT_NOTICE_SKIP: 'Move past this chapter',
    /** [PROPOSED] quiet position indicator, off by default (§3.9). */
    POSITION_LABEL: 'Position in the Opening Arc',
  },

  /**
   * Reading settings (§3.9). One quiet affordance, corner placement, never over text.
   * Every control is honoured instantly and never account-gated.
   */
  SETTINGS: {
    TITLE: 'Reading settings',
    OPEN: 'Reading settings',
    CLOSE: 'Close settings',
    TEXT_SIZE: 'Text size',
    TEXT_SIZE_SMALLER: 'Smaller text',
    TEXT_SIZE_LARGER: 'Larger text',
    THEME: 'Theme',
    THEME_DARK: 'Deep field',
    THEME_LIGHT: 'Light page',
    AUDIO: 'Audio',
    AUDIO_OFF: 'Off',
    AUDIO_AMBIENT: 'Ambient',
    VOLUME: 'Volume',
    EXPERIENCE_DEPTH: 'Experience depth',
    REMEMBER_PLACE: 'Remember my place on this device',
    REMEMBER_PLACE_CLEAR: 'Clear my saved place on this device',
    /** [PROPOSED] confirmation before local progress is cleared (§3.9). */
    REMEMBER_PLACE_CONFIRM: 'Your saved place on this device will be removed. Continue?',
    /** Reserved — Multilingual Resonance Layer, later phase (§3.9). */
    LANGUAGE: 'Language',
    /** The only language the certified release exists in today; the control is inert. */
    LANGUAGE_CURRENT: 'English',
    /** [PROPOSED] the hairline position mark, off by default (§3.9). Never a percentage. */
    POSITION_INDICATOR: 'Show a quiet position mark',
  },

  /* ------------------------------------------------------------------ */
  /* Resume (§3.8.2)                                                     */
  /* ------------------------------------------------------------------ */
  RESUME: {
    /** LOCKED — founder to approve. Offered, never forced; no re-engagement mechanics. */
    CARD: 'Welcome back. Your place in the Opening Arc is kept.',
    /** LOCKED. */
    CONTINUE: 'Continue reading',
    /** LOCKED. */
    RESTART: 'Begin again from the start',
  },

  /* ------------------------------------------------------------------ */
  /* S11 Share Opportunity (§4). Prompt text itself comes from the server. */
  /* ------------------------------------------------------------------ */
  SHARE: {
    /** LOCKED pathway label, reused as the S11 affordance (§5, §8.10.3). */
    OFFER: 'Share the Opening Arc',
    /** [PROPOSED] declining is equal in weight to accepting. */
    DECLINE: 'Not now',
    /** [PROPOSED] no celebration, no counter, no confirmation animation (§3.8.4). */
    READY: 'The link is ready.',
    COPY_LINK: 'Copy the link',
    COPIED: 'Copied.',
    /** [PROPOSED] mail-client channel. */
    EMAIL: 'Email',
    EMAIL_SUBJECT: 'One Global People',
    /** [PROPOSED] present, not yet wired. */
    WHATSAPP: 'WhatsApp',
    LINKEDIN: 'LinkedIn',
    COMING_SOON: 'Coming soon',
    /**
     * [PROPOSED] what a reader is told when they choose a channel that is not built.
     *
     * They used to be `disabled` buttons wearing the words "Coming soon", which answers the
     * question only for a reader who can see the label beside the control — a disabled button
     * cannot be focused, cannot be activated, and cannot explain itself. These say the same
     * thing on request, and point at the channel that does work.
     */
    SOON_TITLE: '{channel} is not ready yet',
    SOON_BODY:
      'This way of passing the Opening Arc on has not been built yet. Nothing is missing from your side — the channel itself is unfinished.',
    SOON_ALTERNATIVE:
      'Email works today, and copying the link works anywhere. Either one carries the same reading.',

    /* ---- The email a reader writes (§5.3) ---- */

    /** [PROPOSED] the composer opened by the Email channel. */
    COMPOSE_TITLE: 'Pass this on by email',
    COMPOSE_INTRO:
      'Your own mail application opens with this message in it. Nothing is sent from here, and no address is ever seen by us.',
    COMPOSE_NAME: 'Your name (optional)',
    COMPOSE_MESSAGE: 'What you want to say',
    /** [PROPOSED] §5.3 permits the pre-fill "and the reader may edit it". This says so. */
    COMPOSE_MESSAGE_HINT: 'These words are only a starting point. Change them to your own.',
    COMPOSE_PREVIEW: 'What will arrive',
    COMPOSE_SEND: 'Open your email app',
    /**
     * [PROPOSED] the greeting, assembled around the reader's name rather than baked into the
     * locked message below — `MESSAGE` is §5.3's exact pre-fill and stays as it is written.
     */
    COMPOSE_GREETING: 'Hello — it is {name}.',
    /** [PROPOSED] a share may always be withdrawn. */
    REVOKE: 'Withdraw this link',
    /** [PROPOSED] confirmation that a withdrawal took effect. No counter, no flourish. */
    REVOKED: 'The link has been withdrawn.',
    /** [PROPOSED] §5.4 — exactly two channels, one quiet row. The native share sheet. */
    NATIVE: 'Pass this on',
    /** [PROPOSED] accessible label of the read-only link field. */
    LINK_LABEL: 'Link to the Opening Arc',
    /**
     * [PROPOSED, exact] §5.3 — the only permitted pre-fill, and the reader may edit it.
     * Never "Read this."
     */
    MESSAGE: 'I thought of you while taking this journey.',
  },

  /* ------------------------------------------------------------------ */
  /* S13 Opening Arc Complete (§3.13)                                    */
  /* ------------------------------------------------------------------ */
  COMPLETE: {
    /** [PROPOSED] the one quiet affordance after the decompression hold. Founder to approve. */
    CONTINUE: 'Continue',
    /** LOCKED. Beta builds only — the Founding Reader questionnaire entry (§3.13). */
    BETA_END_BUTTON: 'Continue to Observations',
  },

  /**
   * Marking a passage while reading (§3.13), and the note a reader may leave afterwards.
   *
   * Two rules shape every string in this group.
   *
   * **Nothing here asks a question during the reading.** §3.13 puts the questionnaire after
   * completion — "Please read the Opening Arc without stopping to edit" — so while reading a
   * reader may only *mark* a passage. `MARK_*` is therefore the whole mid-read vocabulary:
   * two labels and two confirmations, no prompt, no form, no question.
   *
   * **The prompts ask about the work, never about the reader's satisfaction.** §5's framing
   * is "Feedback is evidence, not governance": what was clear, what was not, what felt
   * honest, what got in the way. There is no "did you enjoy it", no rating out of five, no
   * recommendation score. A reader is a witness here, not a respondent to a survey.
   */
  FEEDBACK: {
    /* ---- While reading: marking only (§3.13) ---- */

    /** [PROPOSED] the one quiet inline action offered on a text selection. */
    MARK_PASSAGE: 'Mark this passage',
    /** [PROPOSED] the same action on a passage already marked — selecting it again removes it. */
    MARK_PASSAGE_REMOVE: 'Remove this mark',
    /** [PROPOSED] the keyboard equivalent, in the reading controls (§8.10.4). */
    MARK_SECTION: 'Mark this section',
    MARK_SECTION_REMOVE: 'Remove the mark on this section',
    /** [PROPOSED] announced, not drawn. No badge, no counter, no celebration (§14.4.1). */
    MARK_ADDED: 'Passage marked.',
    MARK_REMOVED: 'Mark removed.',
    /**
     * [PROPOSED] the honest limit, stated once and only when it is reached. `{count}` is the
     * server's cap on one submission — the marks are not thrown away to make room.
     */
    MARKS_FULL: 'You have marked {count} passages. Remove one before marking another.',

    /* ---- While reading: the note on a marked passage ---- */

    /**
     * [PROPOSED] the second control on an already-marked passage, and never the first.
     *
     * §3.13 puts the instrument after the reading, and the order is kept here: marking still
     * leads nowhere on its own, and this appears only once a mark exists and only beside it.
     * Writing now or writing at the end reaches the same place, with the same reference.
     */
    PASSAGE_NOTE_ACTION: 'Leave a note',
    PASSAGE_NOTE_TITLE: 'A note on this passage',
    PASSAGE_NOTE_INTRO:
      'The passage below travels with what you write, so there is no need to describe where you were.',
    /** [PROPOSED] said once, so nobody feels they must write now to be heard. */
    PASSAGE_NOTE_LATER:
      'You can also leave this until the end of the Opening Arc, where every passage you marked is waiting.',

    /* ---- After completion: the note (§5.8, §3.13) ---- */

    /** [PROPOSED] the S13 invitation. An offer standing beside the way onward, never in it. */
    INVITE: 'Leave a note on the reading',
    /** [PROPOSED] landmark name of the form. */
    TITLE: 'Notes on the reading',
    /**
     * [PROPOSED] the orienting line. It names what is useful — the four things §5 asks
     * evidence for — and says plainly that nothing depends on it.
     */
    INTRO:
      'What was clear, and what was not. What felt honest. What got in the way. Write as much or as little as you want, or continue without writing anything.',
    /** [PROPOSED] the marked passages, listed first because the reader chose them. */
    MARKED_HEADING: 'The passages you marked',
    MARKED_NOTE:
      'These are the passages you marked while reading. Write about any of them, or remove the ones you no longer mean.',
    MARKED_COMMENT_LABEL: 'What you want to say about this passage',
    MARK_DISCARD: 'Remove this passage from the note',
    /**
     * [PROPOSED] said when a removed passage had writing under it. Removing the quotation
     * must never remove the reader's own words with it, so they are moved into the note
     * above and this says where they went — once, quietly, without asking anything.
     */
    MARK_DISCARD_KEPT: 'What you wrote about that passage has been moved into the note above.',
    /** [PROPOSED] where a mark covers a whole section rather than a selected range. */
    MARKED_SECTION: 'A whole section, marked from the reading controls.',
    /**
     * [PROPOSED] the line that introduces each per-passage comment inside the sent note.
     *
     * The wire's passage anchor carries a reference and no prose — `{ unitId, excerpt,
     * charStart, charEnd }` and nothing else — so what a reader writes *about* a passage
     * travels in the note itself, under this heading, with the anchor still attached beside
     * it. It is written for the person who reads the note, and so it lives here.
     */
    PASSAGE_NOTE_PREFIX: 'On the marked passage in',

    /** [PROPOSED] the required field. It is the point of the form, and it says so. */
    BODY_LABEL: 'What you want to say',
    BODY_HINT: 'This is the part that gets read.',
    BODY_REQUIRED: 'There is nothing written here yet. Write something, and it will be read.',
    BODY_TOO_LONG: 'This note is longer than can be sent. Shorten it a little and try again.',

    CATEGORY_LABEL: 'What is this mostly about?',
    /** [PROPOSED] no heading is pre-selected: choosing one for the reader would be a guess. */
    CATEGORY_NONE: 'No particular heading',
    /**
     * [PROPOSED] labels for the server's fixed category vocabulary. The keys are the wire
     * values; only the language is here.
     */
    CATEGORY_LABELS: {
      clarity: 'Clarity — what was hard to follow',
      honesty: 'Honesty — what did or did not ring true',
      accessibility: 'Reading it — text, motion, sound, the way it is presented',
      pacing: 'Pacing — where it moved too fast or too slowly',
      emotional_weight: 'Weight — what it asked of you to read',
      factual_concern: 'A factual concern',
      technical_problem: 'Something did not work',
      other: 'Something else',
    },

    NAME_LABEL: 'Your name (optional)',
    EMAIL_LABEL: 'Email address (optional)',
    /** [PROPOSED, exact] off by default; the address means nothing without it (§14.4.3). */
    CONTACT_CONSENT: 'You may write back to me about this note.',
    CONTACT_CONSENT_NOTE:
      'Your address is kept only while this is ticked. Leave it unticked and the address is discarded when the note is sent, and nobody will write to you.',
    EMAIL_NEEDED: 'Add an address that can receive a reply, or untick the box above.',
    EMAIL_INVALID: 'That address cannot receive a reply. Check it, or untick the box above.',
    /** [PROPOSED] said quietly, while it can still be changed. Never a blocking error. */
    EMAIL_WITHOUT_CONSENT: 'This address will be discarded unless the box below is ticked.',

    SUBMIT: 'Send this note',
    /** [PROPOSED] a plain word while the request is in flight. Never a spinner (§0.6). */
    WORKING: 'Working.',
    /** [PROPOSED] one quiet acknowledgement. No counter, no badge, no thank-you animation. */
    CONFIRMATION: 'Your note has been received. Thank you.',
    /** [PROPOSED] quiet degradation; the reader is never shown a status code (§3.3). */
    UNAVAILABLE: 'The note could not be sent just now. You can try again.',
    /**
     * [PROPOSED] the four failures a reader can actually do something about, said separately.
     *
     * One message for every cause is a kindness only when every cause has the same remedy.
     * These do not: waiting helps a dropped connection and never helps a note that is too
     * long, and "you can try again" told to someone who has reached an hourly limit is an
     * instruction to keep failing. Each of these says what happened and what would change it,
     * and each says the note is still here — which is the part a reader is actually worried
     * about once something has gone wrong (§3.3: no status codes, no mechanism, no blame).
     */
    OFFLINE:
      'The connection dropped before the note was sent. Your words are still here — try again when you are back online.',
    SLOW: 'The note is taking longer to send than expected. Your words are still here — you can try again.',
    TOO_MANY:
      'Several notes have already been sent from this reading. Your words are still here — try again in a little while.',
    REFUSED:
      'The note could not be accepted as written. Your words are still here — shortening it, or removing any unusual characters, usually helps.',
    /** [PROPOSED] leaving the form is always as easy as opening it. */
    CLOSE: 'Close without sending',
  },

  /* ------------------------------------------------------------------ */
  /* S14 Choose Your Path (§5, §8.10.3)                                  */
  /* ------------------------------------------------------------------ */
  PATHWAYS: {
    /** LOCKED. */
    HEADING: 'Choose Your Path',
    /** LOCKED. */
    INTRO: 'The Opening Arc is complete. What follows is yours to choose.',
    /**
     * [PROPOSED] the way back into the work from the last screen of it.
     *
     * Not one of the listed pathways: §6.2 forbids promoting or ranking any of
     * them, so this sits below the list at chrome weight. It exists because S14 declares no
     * transitions — correct, since the arc ends there — which also left a reader who had
     * finished with no route to read it a second time, and a reload returned them to S14
     * because it is a resume checkpoint. Wanting to read something again is not a failure of
     * the ending; it is the best thing a reader can say about it.
     */
    READ_AGAIN: 'Read the Opening Arc again',
    READ_AGAIN_NOTE:
      'The opening plays from the beginning and the manuscript starts at its first page. Passages you marked are kept.',
    /**
     * The listed end pathways. Labels are LOCKED canonical; sub-copy is [PROPOSED].
     * Equal weight, no recommended option, no urgency, no prices here (§8.10.3).
     * `pathwaysData.js` reads these — the strings live here and only here.
     *
     * `support_mission` is omitted: it was the same donation page as
     * `donate_digital_transcript`. `return_later` is omitted too — the reading position is
     * kept on the device without an account, so leaving needs no pathway of its own.
     */
    ITEMS: {
      continue_founders_edition: {
        label: "Continue the Founder's Edition",
        subCopy: 'The manuscript continues beyond the Opening Arc.',
      },
      donate_digital_transcript: {
        label: 'Donate for Digital Transcript Access',
        subCopy: 'A contribution of your choosing opens the complete digital transcript.',
      },
      purchase_hardcover: {
        label: 'Purchase / Reserve Hardcover Copy',
        subCopy: 'Reserve the printed edition, or purchase when it becomes available.',
      },
      become_family: {
        /** LOCKED threshold phrase — the trailing period is part of the phrase. */
        label: 'Become Family.',
        subCopy: 'Continue with the One Global Family.',
      },
      share_opening_arc: {
        label: 'Share the Opening Arc',
        subCopy: 'Offer someone their own journey.',
      },
    },
  },

  /**
   * The locked threshold phrase (§8.10.2). Appears rarely, only at validated convergence
   * thresholds, surrounded by silence and visual breathing space. Never wallpaper,
   * never a header, never repeated.
   */
  THRESHOLD: {
    /** LOCKED — the trailing period is part of the phrase. */
    PHRASE: 'Become Family.',
  },

  /* ------------------------------------------------------------------ */
  /* S14 pathway 1 — Continue the Founder's Edition (§6.3)               */
  /* ------------------------------------------------------------------ */
  CONTINUE_EDITION: {
    /**
     * [PROPOSED] §3.5.3 — the Founder's Edition continuation is a certification candidate,
     * not a published release. The reader is told plainly, with no waitlist and no capture.
     */
    NOTICE:
      'Your place is kept. The manuscript beyond the Opening Arc opens here once the certified edition is published.',
  },

  /* ------------------------------------------------------------------ */
  /* S14 pathway 4 — the "Become Family." threshold and its quiet form   */
  /* (§5.5). The interface never says "member" — the role is internal.   */
  /* ------------------------------------------------------------------ */
  FAMILY: {
    /** [PROPOSED] the single affordance that fades in after the 4 s stillness (§8.10.2). */
    THRESHOLD_CONTINUE: 'Continue',
    /** LOCKED sub-copy of pathway 4, reused as the form's one orienting line. */
    INTRO: 'Continue with the One Global Family.',
    EMAIL: 'Email address',
    DISPLAY_NAME: 'Chosen name (optional)',
    COMMUNICATION: 'Written updates',
    COMMUNICATION_ON: 'Send occasional written updates',
    COMMUNICATION_OFF: 'Send nothing',
    SUBMIT: 'Continue',
    /** [PROPOSED, exact] §5.5 — one screen, then back to where the reader was. */
    CONFIRMATION: 'You are part of the Global Family. Nothing more is asked of you.',
  },

  /* ------------------------------------------------------------------ */
  /* S14 pathway 2 — the donation workflow (§6.6)                        */
  /* Pay-what-you-can. No highlighted amount, no goal meter, no upsell.  */
  /* ------------------------------------------------------------------ */
  CONTRIBUTE: {
    AMOUNT: 'Amount',
    /** [PROPOSED] the pay-what-you-can instruction. No suggestion, no comparison. */
    AMOUNT_HINT: 'Choose any amount.',
    CUSTOM_AMOUNT: 'Another amount',
    CURRENCY_SYMBOL: '$',
    CURRENCY_CODE: 'USD',
    EMAIL: 'Email address',
    EMAIL_HINT: 'Used for the receipt, and for delivery where something is delivered.',
    NAME: 'Name (optional)',
    /** [PROPOSED, exact] §6.6 step 3. */
    ANONYMOUS: 'Keep my contribution anonymous.',
    /** [PROPOSED, exact] §6.6 step 2 — the free path, shown only when the founder enables it. */
    FREE_ACCESS: 'Receive the digital transcript without contributing.',
    CONTINUE_TO_PAYMENT: 'Continue',
    PAY: 'Complete the contribution',
    /** [PROPOSED] a quiet processing line. Never a spinner (§0.6). */
    WORKING: 'Working.',
    /** [PROPOSED, exact] §6.6 acknowledgment. No badge, tier, meter or give-again ask. */
    THANK_YOU: 'Thank you. Your contribution helps this work continue.',
    TRANSCRIPT_READY: 'The complete digital transcript is available at this link.',
    /** [PROPOSED] a decline is a fact, not a failure, and never blocks reading (§6.1.5). */
    DECLINED: 'The card was not accepted. Nothing has been charged. You can try again.',
    RECEIPT: 'Receipt number',
    AMOUNT_INVALID: 'Enter an amount of at least one dollar.',
    EMAIL_INVALID: 'Enter an email address that can receive the receipt.',
  },

  /* ------------------------------------------------------------------ */
  /* S14 pathway 3 — the product purchase workflow (§6.7)                */
  /* Strictly separate from the donation workflow. No cross-sell, ever.  */
  /* ------------------------------------------------------------------ */
  HARDCOVER: {
    RESERVE_TITLE: 'Reserve the hardcover edition',
    PURCHASE_TITLE: 'Purchase the hardcover edition',
    QUANTITY: 'Quantity',
    EMAIL: 'Email address',
    RESERVE_SUBMIT: 'Record my reservation',
    /** [PROPOSED, exact] §6.7 — the confirmation states plainly that nothing was charged. */
    RESERVE_CONFIRMATION:
      'Your hardcover reservation is recorded. You will receive one message when the edition is ready. Nothing has been charged.',
    PURCHASE_SUBMIT: 'Complete the purchase',
    PURCHASE_CONFIRMATION: 'Your order is recorded. A receipt has been sent to your email address.',
    /** [PROPOSED] honest about the wait; never scarcity framing (§6.7 fulfillment_hold). */
    PURCHASE_WAIT_NOTE: 'The printed edition ships when production is complete.',
    SHIPPING: 'Shipping address',
    SHIPPING_LINE1: 'Street address',
    SHIPPING_LINE2: 'Address line 2 (optional)',
    SHIPPING_CITY: 'City',
    SHIPPING_REGION: 'State or region',
    SHIPPING_POSTAL: 'Postal code',
    SHIPPING_COUNTRY: 'Country',
    /** [PROPOSED] shown while `HARDCOVER_PURCHASABLE` is off — reserve remains open. */
    UNAVAILABLE:
      'The printed edition is not yet available to purchase. It can be reserved, and nothing is charged.',
  },

  /* ------------------------------------------------------------------ */
  /* Payment fields (§6.5.3). Card data never touches this application.  */
  /* ------------------------------------------------------------------ */
  PAYMENT: {
    CARD_NUMBER: 'Card number',
    EXPIRY: 'Expiry date',
    CVV: 'Security code',
    /** [PROPOSED] the honest degradation when no public tokenization key is configured. */
    UNAVAILABLE: 'Payment is not available on this build. Nothing has been charged.',
    /** [PROPOSED] states the PCI posture plainly rather than with a padlock icon. */
    SECURE_NOTE:
      'Card details are entered directly with the payment provider and never reach this site.',
    /**
     * Development-only diagnostics. Never rendered in a production build, and written for
     * whoever is configuring the site rather than for a reader — the reader-facing line above
     * stays incurious about the cause, which is correct for them and useless for an operator.
     */
    DEV_KEY_MISSING:
      'Development note: VITE_NMI_COLLECT_JS_KEY is empty, so the hosted card fields cannot load. Set the public tokenization key in frontend/.env, and NMI_SECURITY_KEY in Backend/.env, then restart both. The rest of the workflow is already wired.',
    DEV_SCRIPT_BLOCKED:
      'Development note: a tokenization key is set but Collect.js did not load. Check that secure.nmi.com is reachable and not blocked by an extension or the connect-src policy.',
  },

  /* ------------------------------------------------------------------ */
  /* Founding Reader private reading page, /openingarc (§5.6, §5.10)     */
  /* ------------------------------------------------------------------ */
  BETA: {
    /** [PROPOSED, exact] §5.10 — the bare-URL line. No form, no marketing, no capture. */
    GATE_NOTICE:
      'This reading page is open to invited Founding Readers. If you were invited, please use the link you received.',
    CODE_LABEL: 'Group code',
    CODE_SUBMIT: 'Open the reading page',
    CODE_REJECTED: 'That code is not recognised. You can try again.',
    PAGE_LABEL: 'Founding Reader reading page',
  },

  /* ------------------------------------------------------------------ */
  /* Beta Test Questionnaire v2.0 (§5.8). Questions are DATA, not code.  */
  /* ------------------------------------------------------------------ */
  QUESTIONNAIRE: {
    /**
     * [PROPOSED] the landmark name.
     *
     * Every heading the reviewer actually reads — the instrument's title, its purpose, its
     * instruction, the scale legend and all nineteen prompts — arrives from the API, because
     * the questions are the thing under test and must be quotable back to the founder
     * verbatim. What is here is the chrome around them: labels for controls the instrument
     * does not name, and the handful of sentences said when something fails.
     */
    TITLE: 'Observations',
    SUBMIT: 'Send my observations',
    /** [PROPOSED, exact] §5.8 — one quiet confirmation. */
    CONFIRMATION: 'Your observations have been received. Thank you.',
    REQUIRED: 'Required',
    /** §5.8 Q12 — the free-text companion to the word chips. */
    OTHER: 'Something else',
    /** §5.8 reviewer metadata — the default when reached from the reading page. */
    READING_FORMAT_DEFAULT: 'immersive room',
    /** [PROPOSED] quiet degradation; the reader is never shown a status code. */
    UNAVAILABLE: 'The observation form is not available at the moment. You can try again.',
    /** [PROPOSED] the fixed 1–5 anchor legend is supplied by the instrument, not invented. */
    RATING_LABEL: 'Rating',
    RATING_CLEAR: 'Clear this rating',
    EXPLANATION_LABEL: 'Explanation',
    RESPONSE_LABEL: 'Response',
    /** [PROPOSED] the loading line. A sentence rather than a spinner (§0.6). */
    LOADING: 'Opening the questionnaire.',
    /** [PROPOSED] a plain word while the request is in flight. */
    WORKING: 'Working.',

    /**
     * [PROPOSED] the standalone page at `/test-questionnaire`.
     *
     * Its own address because a beta reviewer is sent a link to it: they read the manuscript
     * as a document, in print, or in the reading room, and then come here. The page therefore
     * says which manuscript it is asking about, since a reviewer arriving from an email has
     * no surrounding context to tell them.
     */
    PAGE_LABEL: 'Opening Arc Beta Test Questionnaire',
    PAGE_ORGANISATION: 'One Global People',
    /** [PROPOSED] shown above the submit control, counting what was left blank. */
    UNANSWERED_ONE: '1 question is unanswered. You can send it as it is.',
    UNANSWERED_MANY: '{count} questions are unanswered. You can send them as they are.',
    ALL_ANSWERED: 'Every question has an answer.',
    /** [PROPOSED] the draft line. Said once, so nobody fears losing an hour of writing. */
    DRAFT_KEPT: 'Your answers are kept on this device as you write.',
    /** [PROPOSED] the way back, offered only once there is somewhere to go back to. */
    RETURN: 'Return to the reading',

    /**
     * [PROPOSED] the four failures a reviewer can act on, said separately — the same reasoning
     * as `FEEDBACK`: one message for every cause is a kindness only when every cause has the
     * same remedy. Each says the answers are still here, because after an hour of writing
     * that is the thing a person is actually afraid of.
     */
    OFFLINE:
      'The connection dropped before your answers were sent. They are still here — try again when you are back online.',
    SLOW: 'This is taking longer to send than expected. Your answers are still here — you can try again.',
    TOO_MANY:
      'Several submissions have already been sent from this device. Your answers are still here — try again in a little while.',
    REFUSED:
      'These answers could not be accepted as written. They are still here — shortening a long answer usually helps.',
    ALREADY_SENT: 'Your observations have already been received. Thank you.',
    /** [PROPOSED] shown when no instrument is active. Not a fault the reviewer caused. */
    CLOSED: 'The questionnaire is not open at the moment.',
  },

  /* ------------------------------------------------------------------ */
  /* Minimal navigation after entry (§7.3)                               */
  /* ------------------------------------------------------------------ */
  NAV: {
    /** [PROPOSED] label of the single unobtrusive cluster. */
    LABEL: 'Reading room controls',
    PATHS: 'Choose Your Path',
    SETTINGS: 'Reading settings',
    SOUND: 'Sound',
    /** [PROPOSED] opens Email / WhatsApp / LinkedIn. */
    SHARE: 'Share',
  },

  /* ------------------------------------------------------------------ */
  /* Quiet degradation. The reader never sees a technical error (§3.3).  */
  /* ------------------------------------------------------------------ */
  NOTICES: {
    /** LOCKED — the only failure language the reader may ever see in the reading path. */
    ROOM_SLOW: 'The room is taking a moment to open. You can try again.',
    /** [PROPOSED] the retry affordance beside it. */
    ROOM_SLOW_RETRY: 'Try again',
    /** [PROPOSED] shown only when WebGL is unavailable; the manuscript still opens. */
    NO_WEBGL: 'This device will show the manuscript without the surrounding scene.',
  },

  /**
   * Quiet, dismissible, one-time orientation hints (§7.3 de-gamified milestones).
   * No badges, no counters, no unlock language, no celebration. Private and non-comparative.
   */
  HINTS: {
    reading_controls: 'Arrow keys and space scroll. Enter continues at the end of a section.',
    reading_settings: 'Text size, motion and sound can be adjusted at any time.',
    reading_place: 'Your place is kept on this device. You can leave and return.',
  },

  /* ------------------------------------------------------------------ */
  /* The operations panel at /admin-panel (§10).                         */
  /*                                                                     */
  /* A support surface, not the experience. §8.8 permits surfaces        */
  /* outside the experience to invert the token family into a light      */
  /* theme; §10.5 requires "plain, information-dense internal styling —  */
  /* the cinematic design mandate (§8) applies to the reader experience, */
  /* not to this tool". So the language here is plain operational        */
  /* English: no threshold voice, no invitations, no protected wording.  */
  /* The prohibited vocabulary still applies in full (§14.4.1) — these   */
  /* strings are read by humans, and the rule is about respect for       */
  /* readers, not about which port serves the page.                      */
  /* ------------------------------------------------------------------ */
  ADMIN: {
    SHELL: {
      /** The organisation, then what this surface is. Never the reading room's language. */
      TITLE: 'One Global People',
      SUBTITLE: 'Operations',
      NAV_LABEL: 'Operations sections',
      MAIN_LABEL: 'Operations content',
      SKIP_TO_CONTENT: 'Skip to the panel content',
      SIGNED_IN_AS: 'Signed in as',
      ROLE: 'Role',
      SIGN_OUT: 'Sign out',
      SIGNING_OUT: 'Signing out.',
    },

    NAV: {
      INVITATIONS: 'Invitations',
      TEMPLATES: 'Message templates',
      FEEDBACK: 'Reader feedback',
      COHORTS: 'Cohorts',
      /**
       * Named for the instrument rather than for the table, and deliberately not "feedback":
       * the two are different bodies of evidence. A note is a reader speaking unprompted at a
       * moment of their choosing; a returned questionnaire is nineteen answers to nineteen
       * questions. Reading them in one queue would let the volume of one drown the other.
       */
      RESPONSES: 'Test Questionnaire',
      METRICS: 'Funnel metrics',
      AUDIT: 'Audit log',
    },

    /** §9.2.10 / §10.8.2 — password AND authenticator code, every role, no exceptions. */
    AUTH: {
      HEADING: 'Operations sign-in',
      /** Shown when the real MFA form is in use. */
      INTRO: 'An email address, a password and a six-digit authenticator code are all required.',
      /** Shown while the interim local gate is on — see src/admin/adminLocalGate.js. */
      INTRO_LOCAL: 'Enter the operations name and password.',
      EMAIL: 'Email address',
      /** The interim gate takes a name rather than an address. */
      NAME: 'Name',
      PASSWORD: 'Password',
      TOTP: 'Authenticator code',
      TOTP_HINT: 'Six digits from your authenticator application.',
      SUBMIT: 'Sign in',
      WORKING: 'Checking your details.',
      MISSING: 'Every field is required.',
      TOTP_FORMAT: 'The authenticator code is six digits.',
      FAILED: 'Those details were not accepted. You can try again.',
      SESSION_ENDED: 'That session ended. Please sign in again.',
      /**
       * Stated plainly rather than discovered: no admin token is written to browser
       * storage (§10.8.2 least privilege), so a reload genuinely ends the session.
       */
      SESSION_NOTE: 'This session is held in memory only. Reloading the page signs you out.',
    },

    COMMON: {
      LOADING: 'Loading.',
      WORKING: 'Working.',
      EMPTY: 'Nothing to show yet.',
      ERROR_TITLE: 'That request did not complete',
      ERROR_GENERIC: 'The request could not be completed. You can try again.',
      FORBIDDEN: 'Your role does not have access to this view.',
      RETRY: 'Try again',
      REFRESH: 'Refresh',
      FILTERS: 'Filters',
      APPLY: 'Apply filters',
      CLEAR: 'Clear filters',
      ALL: 'All',
      NONE: 'None',
      SEARCH: 'Search',
      PREVIOUS_PAGE: 'Previous page',
      NEXT_PAGE: 'Next page',
      /** Filled with the first row, the last row and the total. */
      SHOWING: 'Showing {from}–{to} of {total}',
      PAGE_POSITION: 'Page {page}',
      SAVE: 'Save',
      SAVING: 'Saving.',
      SAVED: 'Saved.',
      CANCEL: 'Cancel',
      CLOSE: 'Close',
      DATE_FROM: 'From date',
      DATE_TO: 'To date',
      COHORT: 'Cohort',
      STATUS: 'Status',
      CATEGORY: 'Category',
      UNIT: 'Manuscript unit',
      CREATED: 'Created',
      UPDATED: 'Updated',
      DETAILS: 'Details',
      NOT_RECORDED: 'Not recorded',
      /** Stands in a cell where a ratio has no meaning, such as the first funnel step. */
      NOT_APPLICABLE: '—',
    },

    /**
     * Status vocabularies, rendered as words beside their colour. §8.10.4 accessibility:
     * colour never carries meaning on its own, so every state has a label here.
     */
    STATUS: {
      INVITATION: {
        new_interest: 'New interest',
        approved: 'Approved',
        invited: 'Reading link sent',
        welcome_sent: 'Welcome sent',
        reading_link_sent: 'Reading link sent',
        opened: 'Opened',
        redeemed: 'Redeemed',
        questionnaire_completed: 'Questionnaire completed',
        follow_up_needed: 'Follow-up needed',
        not_selected: 'Not selected',
        revoked: 'Withdrawn',
      },
      FEEDBACK: {
        new: 'New',
        triaged: 'Triaged',
        actioned: 'Actioned',
        archived: 'Archived',
      },
      COHORT: {
        planned: 'Planned',
        inviting: 'Inviting',
        active: 'Active',
        closed: 'Closed',
      },
      SEND: {
        sent: 'Sent',
        skipped: 'Skipped',
        failed: 'Failed',
      },
      ADDRESS: {
        valid: 'Will be written to',
        duplicate: 'Repeated in this list',
        invalid: 'Not a usable address',
      },
    },

    /** Feedback categories (§3.13 observation vocabulary). */
    CATEGORY: {
      clarity: 'Clarity',
      honesty: 'Honesty',
      accessibility: 'Accessibility',
      pacing: 'Pacing',
      emotional_weight: 'Emotional weight',
      factual_concern: 'Factual concern',
      technical_problem: 'Technical problem',
      other: 'Something else',
    },

    INVITATIONS: {
      HEADING: 'Invitations',
      /** §5.7 — a cohort is 15–50 people, addressed one message each. */
      INTRO:
        'Founding Reader records and their private reading links. Each address receives its own message; nobody is placed on a shared envelope.',

      COMPOSE_HEADING: 'Write to addresses',
      ADDRESSES_LABEL: 'Email addresses',
      ADDRESSES_HINT:
        'One per line, or separated by commas. Repeated addresses are written to once.',
      ADDRESSES_PLACEHOLDER: 'first@example.org, second@example.org',
      PREVIEW_HEADING: 'Addresses read from what you typed',
      PREVIEW_EMPTY: 'No addresses yet.',
      PREVIEW_COUNTS: '{valid} to write to · {duplicate} repeated · {invalid} unusable',
      TEMPLATE_LABEL: 'Message template',
      COHORT_LABEL: 'Cohort for these records',
      COHORT_NONE: 'No cohort',
      NOTE_LABEL: 'Extra line to add (optional)',
      NOTE_HINT: 'Added to the end of the message. Held to the same language rules.',
      SEND: 'Send the messages',
      SENDING: 'Sending.',
      SEND_BLOCKED: 'Add at least one usable address.',
      /** The per-address outcome table. Partial failure is normal and is reported. */
      RESULTS_HEADING: 'Result for each address',
      RESULTS_SUMMARY: '{sent} sent · {skipped} skipped · {failed} failed',
      RESULTS_ADDRESS: 'Address',
      RESULTS_OUTCOME: 'Outcome',
      RESULTS_REASON: 'Reason',
      RESULTS_DISMISS: 'Clear these results',
      REASONS: {
        already_invited: 'Already holds a reading link.',
        revoked: 'That reading link was withdrawn.',
        not_selected: 'Recorded as not selected.',
        invalid_address: 'Not a usable address.',
        record_failed: 'The record could not be prepared.',
        mail_failed: 'The message was not accepted for delivery.',
        log_transport: 'Mail is still in log mode — nothing was delivered.',
        not_delivered: 'The mail server did not accept the message.',
      },

      LIST_HEADING: 'Invitation records',
      FIND_LABEL: 'Find in the loaded records',
      FIND_HINT: 'Filters the records already listed below by address, name or code.',
      FILTER_STATUS: 'Status',
      FILTER_COHORT: 'Cohort',
      COLUMN_ADDRESS: 'Address',
      COLUMN_NAME: 'Name',
      COLUMN_CODE: 'Code',
      COLUMN_STATUS: 'Status',
      COLUMN_SENT: 'Reading link sent',
      COLUMN_ACTIONS: 'Actions',
      NO_ADDRESS: 'No address',
      NO_NAME: 'No name recorded',
      RESEND: 'Send again',
      RESENDING: 'Sending.',
      RESENT: 'Sent again.',
      REVOKE: 'Withdraw link',
      REVOKE_CONFIRM: 'Confirm withdrawal',
      REVOKE_CANCEL: 'Keep the link',
      REVOKING: 'Withdrawing.',
      REVOKED: 'The reading link is withdrawn.',
      /** Withdrawal is recorded, never deleted: who was approached is study data (§10.7.2). */
      REVOKE_NOTE: 'The record is kept. Only the reading link stops working.',
      EMPTY: 'No invitation records match these filters.',
    },

    TEMPLATES: {
      HEADING: 'Message templates',
      INTRO:
        'The two Founding Reader messages. The set is fixed: copy can be rewritten, and no new message type can be created here.',
      PICKER_LABEL: 'Template',
      KEYS: {
        beta_invitation: 'First message with the reading link',
        beta_welcome: 'Welcome message for an approved reader',
      },
      SUBJECT: 'Subject line',
      BODY_TEXT: 'Plain-text message',
      BODY_HTML: 'HTML message (optional)',
      PLACEHOLDERS_HEADING: 'Placeholders',
      PLACEHOLDERS_INTRO:
        'These four names are replaced when the message is written. Nothing else in the copy is interpreted.',
      PLACEHOLDER_ITEMS: {
        displayName: 'The reader’s name, or a plain greeting when no name is recorded.',
        invitationUrl: 'The private reading link. Required in the plain-text message.',
        cohortName: 'The cohort name, or empty when the record has no cohort.',
        expiresAt: 'Empty today — Phase 1 codes are single-use rather than time-limited.',
      },
      PREVIEW: 'Preview',
      PREVIEWING: 'Rendering.',
      PREVIEW_HEADING: 'Preview with sample values',
      PREVIEW_SUBJECT: 'Subject',
      PREVIEW_TEXT: 'Plain text',
      PREVIEW_HTML: 'HTML, as it will appear',
      PREVIEW_HTML_SOURCE: 'HTML source',
      PREVIEW_HTML_FRAME: 'Rendered HTML message',
      PREVIEW_NONE: 'No preview yet.',
      SAVE: 'Save this copy',
      SAVED: 'The copy is saved.',
      /** §10.6.2 prohibited-terms lint. The server names the term; we say why plainly. */
      REJECTED_HEADING: 'This copy was refused',
      REJECTED_PROHIBITED:
        'The copy lint refused this text. The message goes to someone who did not ask for marketing language, so there is no override.',
      REJECTED_PLACEHOLDER: 'A placeholder name in this copy is not one the renderer knows.',
      REJECTED_MISSING:
        'The plain-text message must carry the private reading link placeholder.',
      VERSION: 'Version',
      UPDATED_BY: 'Last changed by',
    },

    FEEDBACK: {
      HEADING: 'Reader feedback',
      /** §3.13 — marks are made while reading, commented on after completion. */
      INTRO:
        'What readers wrote after finishing the Opening Arc, with any passages they marked while reading.',
      SUMMARY_HEADING: 'Counts',
      SUMMARY_TOTAL: 'Total',
      SUMMARY_BY_STATUS: 'By triage state',
      SUMMARY_BY_CATEGORY: 'By category',
      SUMMARY_BY_UNIT: 'By manuscript unit',
      SEARCH_LABEL: 'Search the text',
      UNIT_LABEL: 'Manuscript unit',
      UNIT_PLACEHOLDER: 'CU-NONO-OA-008',
      EXPORT: 'Download CSV',
      EXPORTING: 'Preparing the file.',
      EXPORT_FILENAME: 'feedback.csv',
      COLUMN_RECEIVED: 'Received',
      COLUMN_CATEGORY: 'Category',
      COLUMN_STATUS: 'Status',
      COLUMN_PASSAGES: 'Marked passages',
      COLUMN_EXCERPT: 'Opening words',
      OPEN: 'Open',
      EMPTY: 'No feedback matches these filters.',

      DETAIL_HEADING: 'One reader’s observations',
      BACK: 'Back to the list',
      BODY_LABEL: 'What the reader wrote',
      PASSAGES_LABEL: 'Passages the reader marked',
      PASSAGES_EMPTY: 'No passages were marked.',
      PASSAGE_RANGE: 'Characters {start}–{end}',
      NAME_LABEL: 'Name given',
      EMAIL_LABEL: 'Address given',
      /** Contact details exist only where the reader consented (§9.2.7). */
      CONTACT_CONSENT_YES: 'Consented to be contacted',
      CONTACT_CONSENT_NO: 'Did not consent to be contacted',
      READING_FORMAT: 'Read as',
      RELEASE: 'Release',
      STATUS_LABEL: 'Triage state',
      NOTES_LABEL: 'Notes for the team',
      NOTES_HINT: 'Visible to staff only. What the reader wrote is never edited here.',
      SAVE_TRIAGE: 'Save triage',
    },

    COHORTS: {
      HEADING: 'Cohorts',
      INTRO: 'Founding Reader groups and how far each has moved. Read-only.',
      COLUMN_NAME: 'Name',
      COLUMN_TYPE: 'Type',
      COLUMN_STATUS: 'Status',
      COLUMN_TARGET: 'Target size',
      TYPE: {
        individual: 'Individuals',
        organization: 'Organisation',
      },
      SUMMARY_HEADING: 'Progress for this cohort',
      SUMMARY_SELECT: 'Show progress',
      FUNNEL: {
        interested: 'Expressed interest',
        approved: 'Approved',
        linkSent: 'Reading link sent',
        redeemed: 'Redeemed',
        questionnaireCompleted: 'Questionnaire completed',
        followUpNeeded: 'Follow-up needed',
        notSelected: 'Not selected',
      },
      EMPTY: 'No cohorts recorded.',
    },

    /**
     * The returned Test Questionnaire. Its own tab, kept apart from reader feedback.
     *
     * Everything on this screen is aggregate or one whole returned instrument. There is no
     * per-reader view, no session reference and no reading trail, because the projection
     * behind it does not carry one (§10.2, §10.7.3).
     */
    RESPONSES: {
      HEADING: 'Test Questionnaire',
      INTRO:
        'Instruments returned by beta reviewers, in the order they were completed. Listed by cohort and by reading format, never by person.',
      FILTER_QUESTIONNAIRE: 'Instrument',
      FILTER_FORMAT: 'Read as',
      FILTER_CONSENT: 'Quotation',
      SEARCH_LABEL: 'Search the written answers',
      COLUMN_COMPLETED: 'Completed',
      COLUMN_REVIEWER: 'Reviewer',
      COLUMN_COHORT: 'Cohort',
      COLUMN_FORMAT: 'Read as',
      COLUMN_ANSWERS: 'Answered',
      ANSWER_COUNT: '{count} of {total}',
      OPEN: 'Read',
      EMPTY: 'No returned questionnaires match these filters.',
      EXPORT: 'Export CSV',
      EXPORTING: 'Preparing the file.',
      EXPORT_FILENAME: 'test-questionnaire.csv',

      /** The aggregate panel above the table. */
      SUMMARY_HEADING: 'Across these responses',
      SUMMARY_TOTAL: 'Returned',
      SUMMARY_RATINGS: 'Scaled questions',
      SUMMARY_RATINGS_EMPTY: 'No scaled question has been answered yet.',
      SUMMARY_AVERAGE: 'Average',
      SUMMARY_ANSWERED: '{count} answered',
      /** Read by screen readers in place of the bar chart, which carries no meaning alone. */
      DISTRIBUTION_LABEL: '{count} rated this {rating} out of 5.',

      CONSENT_HEADING: 'Permission to quote',
      CONSENT_GRANTED: 'Granted',
      CONSENT_DECLINED: 'Declined',
      CONSENT_NOT_ANSWERED: 'Not answered',

      /** One returned instrument. */
      DETAIL_HEADING: 'Returned questionnaire',
      BACK: 'Back to the questionnaire',
      REVIEWER_HEADING: 'Reviewer',
      REVIEWER_NAME: 'Name or reviewer code',
      REVIEWER_DATE: 'Date completed',
      REVIEWER_TIME: 'Approximate reading time',
      REVIEWER_FORMAT: 'Reading format used',
      REVIEWER_CONSENT: 'Permission to quote',
      ANSWERS_HEADING: 'Answers',
      RATING_VALUE: '{rating} of 5',
      NO_ANSWER: 'Left blank',
      /**
       * Shown against an answer whose question is not in the instrument any more. Kept
       * visible rather than dropped: an answer that no longer has a question is exactly the
       * kind of thing somebody needs to know about.
       */
      UNKNOWN_QUESTION: 'This question is no longer part of the instrument.',
      INSTRUMENT_MISSING:
        'The instrument these answers were given against is no longer stored, so the questions cannot be shown beside them.',
    },

    METRICS: {
      HEADING: 'Funnel metrics',
      /** §10.2 — aggregates only. There is no per-reader view and no route that makes one. */
      INTRO:
        'Session counts across the S0–S14 ladder. Aggregate only: there is no per-reader view anywhere in this panel.',
      RANGE_HEADING: 'Date range',
      COLUMN_STATE: 'State',
      COLUMN_EVENT: 'Event',
      COLUMN_SESSIONS: 'Sessions',
      COLUMN_STEP: 'Step conversion',
      COLUMN_CUMULATIVE: 'Cumulative conversion',
      /** §10.4.2 — skipping is a protected choice, and the panel says so where it is read. */
      SKIP_NOTE: 'Skip is a legitimate path. This panel measures pacing, not obedience.',
      BAR_LABEL: 'Share of the first step',
      EMPTY: 'No sessions recorded in this range.',
    },

    AUDIT: {
      HEADING: 'Audit log',
      /** §10.9 — append-only, read-only for every role including the founder. */
      INTRO: 'Every mutation, in the order it happened. Read-only for every role.',
      FILTER_ACTION: 'Action',
      FILTER_TARGET: 'Target collection',
      FILTER_TARGET_ID: 'Target identifier',
      FILTER_ACTOR: 'Actor identifier',
      COLUMN_AT: 'When',
      COLUMN_ACTOR: 'Actor',
      COLUMN_ACTION: 'Action',
      COLUMN_TARGET: 'Target',
      COLUMN_CHANGE: 'Change',
      BEFORE: 'Before',
      AFTER: 'After',
      SHOW_CHANGE: 'Show the change',
      HIDE_CHANGE: 'Hide the change',
      ACTOR_TYPE: {
        admin: 'Administrator',
        system: 'System',
        webhook: 'Webhook',
      },
      EMPTY: 'No entries match these filters.',
    },
  },
};

export const COPY = deepFreeze(copy);

export default COPY;
