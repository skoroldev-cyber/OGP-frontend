const deepFreeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value)) deepFreeze(value[key]);
  }
  return value;
};

const copy = {
  META: {
    SITE_TAGLINE:
      'Now or never. ONE Global People unites humanity as One Global Family to restore truth, rebuild trust, create accountability, and protect the Shared World.',
    BOOK_TITLE: 'Now or Never',
    BOOK_DASH: '- One',
    BOOK_SUBTITLE: 'The Global Family Unites to Save the World',
    ORGANISATION: 'One Global People',
    READING_ROOM_NAME: 'Immersive Reading Room',
    SECONDARY_LANDING_LINK: 'About One Global',
  },

  AFFORDANCES: {
    SKIP: 'Skip the opening',
    CONTINUE_IN_SILENCE: 'Continue in silence',
    SOUND: 'Sound',
    GROUP_LABEL: 'Experience controls',
    CROSS_HINT: 'Scroll up to continue',
    CROSS_HINT_TOUCH: 'Swipe up to continue',
  },

  A11Y: {
    HIDDEN_ENTRY_LABEL: 'Begin the Journey into the Immersive Reading Room.',
    HIDDEN_READING_ROOM_LABEL: 'Enter the Immersive Reading Room.',
    CANVAS_DESCRIPTION: 'A visual environment accompanies this text. All content is available as text.',
    NARRATIVE_REGION_LABEL: 'Experience narration',
    SKIP_TO_READING: 'Skip to the manuscript',
    CLOSE: 'Close',
    BACK: 'Back',
    DISMISS: 'Dismiss',
    OPENING_PASSAGE_LABEL: 'Opening passage',
  },

  OPENING: {
    RECOGNITIONS: ['Something is here.', 'It is alive.', 'It includes Earth.', 'It concerns me.'],
    THRESHOLD_QUESTION: 'What have we forgotten?',
    THRESHOLD_ACTION: 'Begin the Journey',
    EARTH_REVEAL_SENTENCE:
      'To understand the world, we must understand our relationship to it first.',
  },

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

  PORTAL: {
    FIRST_WORDS: [
      'You did not arrive outside this world.',
      'You were born from within it.',
      'You have never been separate from what you are seeing.',
    ],
    PROTOTYPE_CLOSING: [
      'You are not entering a system.',
      'You are returning to the living source that made you possible.',
    ],
  },

  INVITATION: {
    READING_ROOM_INVITATION: 'Enter',
    TEXT_ONLY_ENTRY: 'Continue with text only',
  },

  AGE: {
    ENTRY_MESSAGE:
      'This reading room can adjust the experience so the manuscript is presented in the clearest and most appropriate way for your stage of life.',
    PROMPT_SHORT: 'Choose your age range.',
    PROMPT_LONG:
      'Select your age range so the reading experience can be presented in the way most appropriate for you.',
    PRIVACY_STATEMENT:
      'Your age range is used only to adjust reading depth, language, and emotional intensity. It is not used to profile you.',
    BANDS: ['8-12', '13-16', '17-19', '20-25', '26-32', '33+'],
    DECLINE: 'Continue without choosing',
  },

  READING: {
    CONTINUE: 'Continue',
    PREVIOUS: 'Previous',
    MANUSCRIPT_LABEL: 'Manuscript',
    CONTROLS_LABEL: 'Reading controls',
    TEXT_SMALLER: 'Smaller text',
    TEXT_LARGER: 'Larger text',
    SETTINGS: 'Reading settings',
    AUTO_READ_START: 'Read automatically',
    AUTO_READ_STOP: 'Pause automatic reading',
    AUTO_READ_PACE: 'Reading pace',
    TEXT_SIZE_STATUS: 'Text size {step} of {total}',
    TRANSITION_CLOSING_LINE:
      'If you are ready for that clarity, proceed to Chapter 2 — Awareness.',
    CONTENT_NOTICE_CH1:
      'The next chapter includes first-person accounts of real harm, including harm to children. Read at your own pace. You may pause at any time.',
    CONTENT_NOTICE_ACKNOWLEDGE: 'Continue',
    CONTENT_NOTICE_REGION: 'Content notice',
    CONTENT_NOTICE_SKIP: 'Move past this chapter',
    POSITION_LABEL: 'Position in the Opening Arc',
  },

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
    REMEMBER_PLACE_CONFIRM: 'Your saved place on this device will be removed. Continue?',
    LANGUAGE: 'Language',
    LANGUAGE_CURRENT: 'English',
    POSITION_INDICATOR: 'Show a quiet position mark',
  },

  RESUME: {
    CARD: 'Welcome back. Your place in the Opening Arc is kept.',
    CONTINUE: 'Continue reading',
    RESTART: 'Begin again from the start',
  },

  SHARE: {
    OFFER: 'Share the Opening Arc',
    DECLINE: 'Not now',
    READY: 'The link is ready.',
    COPY_LINK: 'Copy the link',
    COPIED: 'Copied.',
    EMAIL: 'Email',
    EMAIL_SUBJECT: 'One Global People',
    WHATSAPP: 'WhatsApp',
    LINKEDIN: 'LinkedIn',
    COMING_SOON: 'Coming soon',
    SOON_TITLE: '{channel} is not ready yet',
    SOON_BODY:
      'This way of passing the Opening Arc on has not been built yet. Nothing is missing from your side — the channel itself is unfinished.',
    SOON_ALTERNATIVE:
      'Email works today, and copying the link works anywhere. Either one carries the same reading.',

    COMPOSE_TITLE: 'Pass this on by email',
    COMPOSE_INTRO:
      'Your own mail application opens with this message in it. Nothing is sent from here, and no address is ever seen by us.',
    COMPOSE_NAME: 'Your name (optional)',
    COMPOSE_MESSAGE: 'What you want to say',
    COMPOSE_MESSAGE_HINT: 'These words are only a starting point. Change them to your own.',
    COMPOSE_PREVIEW: 'What will arrive',
    COMPOSE_SEND: 'Open your email app',
    COMPOSE_GREETING: 'Hello — it is {name}.',
    REVOKE: 'Withdraw this link',
    REVOKED: 'The link has been withdrawn.',
    NATIVE: 'Pass this on',
    LINK_LABEL: 'Link to the Opening Arc',
    MESSAGE: 'I thought of you while taking this journey.',
  },

  COMPLETE: {
    CONTINUE: 'Continue',
    BETA_END_BUTTON: 'Continue to Observations',
  },

  FEEDBACK: {

    MARK_PASSAGE: 'Mark this passage',
    MARK_PASSAGE_REMOVE: 'Remove this mark',
    MARK_SECTION: 'Mark this section',
    MARK_SECTION_REMOVE: 'Remove the mark on this section',
    MARK_ADDED: 'Passage marked.',
    MARK_REMOVED: 'Mark removed.',
    MARKS_FULL: 'You have marked {count} passages. Remove one before marking another.',

    PASSAGE_NOTE_ACTION: 'Leave a note',
    PASSAGE_NOTE_TITLE: 'A note on this passage',
    PASSAGE_NOTE_INTRO:
      'The passage below travels with what you write, so there is no need to describe where you were.',
    PASSAGE_NOTE_LATER:
      'You can also leave this until the end of the Opening Arc, where every passage you marked is waiting.',

    INVITE: 'Leave a note on the reading',
    TITLE: 'Notes on the reading',
    INTRO:
      'What was clear, and what was not. What felt honest. What got in the way. Write as much or as little as you want, or continue without writing anything.',
    MARKED_HEADING: 'The passages you marked',
    MARKED_NOTE:
      'These are the passages you marked while reading. Write about any of them, or remove the ones you no longer mean.',
    MARKED_COMMENT_LABEL: 'What you want to say about this passage',
    MARK_DISCARD: 'Remove this passage from the note',
    MARK_DISCARD_KEPT: 'What you wrote about that passage has been moved into the note above.',
    MARKED_SECTION: 'A whole section, marked from the reading controls.',
    PASSAGE_NOTE_PREFIX: 'On the marked passage in',

    BODY_LABEL: 'What you want to say',
    BODY_HINT: 'This is the part that gets read.',
    BODY_REQUIRED: 'There is nothing written here yet. Write something, and it will be read.',
    BODY_TOO_LONG: 'This note is longer than can be sent. Shorten it a little and try again.',

    CATEGORY_LABEL: 'What is this mostly about?',
    CATEGORY_NONE: 'No particular heading',
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
    CONTACT_CONSENT: 'You may write back to me about this note.',
    CONTACT_CONSENT_NOTE:
      'Your address is kept only while this is ticked. Leave it unticked and the address is discarded when the note is sent, and nobody will write to you.',
    EMAIL_NEEDED: 'Add an address that can receive a reply, or untick the box above.',
    EMAIL_INVALID: 'That address cannot receive a reply. Check it, or untick the box above.',
    EMAIL_WITHOUT_CONSENT: 'This address will be discarded unless the box below is ticked.',

    SUBMIT: 'Send this note',
    WORKING: 'Working.',
    CONFIRMATION: 'Your note has been received. Thank you.',
    UNAVAILABLE: 'The note could not be sent just now. You can try again.',
    OFFLINE:
      'The connection dropped before the note was sent. Your words are still here — try again when you are back online.',
    SLOW: 'The note is taking longer to send than expected. Your words are still here — you can try again.',
    TOO_MANY:
      'Several notes have already been sent from this reading. Your words are still here — try again in a little while.',
    REFUSED:
      'The note could not be accepted as written. Your words are still here — shortening it, or removing any unusual characters, usually helps.',
    CLOSE: 'Close without sending',
  },

  PATHWAYS: {
    HEADING: 'Choose Your Path',
    INTRO: 'The Opening Arc is complete. What follows is yours to choose.',
    READ_AGAIN: 'Read the Opening Arc again',
    READ_AGAIN_NOTE:
      'The opening plays from the beginning and the manuscript starts at its first page. Passages you marked are kept.',
    QUESTIONNAIRE: 'Answer the Beta Test Questionnaire',
    QUESTIONNAIRE_NOTE:
      'Questions on the Opening Arc, for readers taking part in the beta. Your answers stay on this device until you send them.',
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
        label: 'Become Family.',
        subCopy: 'Continue with the One Global Family.',
      },
      share_opening_arc: {
        label: 'Share the Opening Arc',
        subCopy: 'Offer someone their own journey.',
      },
    },
  },

  THRESHOLD: {
    PHRASE: 'Become Family.',
  },

  CONTINUE_EDITION: {
    NOTICE:
      'Your place is kept. The manuscript beyond the Opening Arc opens here once the certified edition is published.',
  },

  FAMILY: {
    THRESHOLD_CONTINUE: 'Continue',
    INTRO: 'Continue with the One Global Family.',
    EMAIL: 'Email address',
    DISPLAY_NAME: 'Chosen name (optional)',
    COMMUNICATION: 'Written updates',
    COMMUNICATION_ON: 'Send occasional written updates',
    COMMUNICATION_OFF: 'Send nothing',
    SUBMIT: 'Continue',
    CONFIRMATION: 'You are part of the Global Family. Nothing more is asked of you.',
  },

  CONTRIBUTE: {
    AMOUNT: 'Amount',
    AMOUNT_HINT: 'Choose any amount.',
    CUSTOM_AMOUNT: 'Another amount',
    CURRENCY_SYMBOL: '$',
    CURRENCY_CODE: 'USD',
    EMAIL: 'Email address',
    EMAIL_HINT: 'Used for the receipt, and for delivery where something is delivered.',
    NAME: 'Name (optional)',
    ANONYMOUS: 'Keep my contribution anonymous.',
    FREE_ACCESS: 'Receive the digital transcript without contributing.',
    CONTINUE_TO_PAYMENT: 'Continue',
    PAY: 'Complete the contribution',
    WORKING: 'Working.',
    THANK_YOU: 'Thank you. Your contribution helps this work continue.',
    TRANSCRIPT_READY: 'The complete digital transcript is available at this link.',
    DECLINED: 'The card was not accepted. Nothing has been charged. You can try again.',
    RECEIPT: 'Receipt number',
    AMOUNT_INVALID: 'Enter an amount of at least one dollar.',
    EMAIL_INVALID: 'Enter an email address that can receive the receipt.',
  },

  HARDCOVER: {
    RESERVE_TITLE: 'Reserve the hardcover edition',
    PURCHASE_TITLE: 'Purchase the hardcover edition',
    QUANTITY: 'Quantity',
    EMAIL: 'Email address',
    RESERVE_SUBMIT: 'Record my reservation',
    RESERVE_CONFIRMATION:
      'Your hardcover reservation is recorded. You will receive one message when the edition is ready. Nothing has been charged.',
    PURCHASE_SUBMIT: 'Complete the purchase',
    PURCHASE_CONFIRMATION: 'Your order is recorded. A receipt has been sent to your email address.',
    PURCHASE_WAIT_NOTE: 'The printed edition ships when production is complete.',
    SHIPPING: 'Shipping address',
    SHIPPING_LINE1: 'Street address',
    SHIPPING_LINE2: 'Address line 2 (optional)',
    SHIPPING_CITY: 'City',
    SHIPPING_REGION: 'State or region',
    SHIPPING_POSTAL: 'Postal code',
    SHIPPING_COUNTRY: 'Country',
    UNAVAILABLE:
      'The printed edition is not yet available to purchase. It can be reserved, and nothing is charged.',
  },

  PAYMENT: {
    CARD_NUMBER: 'Card number',
    EXPIRY: 'Expiry date',
    CVV: 'Security code',
    UNAVAILABLE: 'Payment is not available on this build. Nothing has been charged.',
    SECURE_NOTE:
      'Card details are entered directly with the payment provider and never reach this site.',
    DEV_KEY_MISSING:
      'Development note: VITE_NMI_COLLECT_JS_KEY is empty, so the hosted card fields cannot load. Set the public tokenization key in frontend/.env, and NMI_SECURITY_KEY in Backend/.env, then restart both. The rest of the workflow is already wired.',
    DEV_SCRIPT_BLOCKED:
      'Development note: a tokenization key is set but Collect.js did not load. Check that secure.nmi.com is reachable and not blocked by an extension or the connect-src policy.',
  },

  BETA: {
    GATE_NOTICE:
      'This reading page is open to invited Founding Readers. If you were invited, please use the link you received.',
    CODE_LABEL: 'Group code',
    CODE_SUBMIT: 'Open the reading page',
    CODE_REJECTED: 'That code is not recognised. You can try again.',
    PAGE_LABEL: 'Founding Reader reading page',
  },

  QUESTIONNAIRE: {
    TITLE: 'Observations',
    SUBMIT: 'Send my observations',
    CONFIRMATION: 'Your observations have been received. Thank you.',
    REQUIRED: 'Required',
    OTHER: 'Something else',
    READING_FORMAT_DEFAULT: 'immersive room',
    UNAVAILABLE: 'The observation form is not available at the moment. You can try again.',
    RATING_LABEL: 'Rating',
    RATING_CLEAR: 'Clear this rating',
    CHOICE_CLEAR: 'Clear this answer',
    EXPLANATION_LABEL: 'Explanation',
    RESPONSE_LABEL: 'Response',
    LOADING: 'Opening the questionnaire.',
    WORKING: 'Working.',

    PAGE_LABEL: 'Opening Arc Beta Test Questionnaire',
    NAV_LABEL: 'Questionnaire controls',
    UNANSWERED_ONE: '1 question is unanswered. You can send it as it is.',
    UNANSWERED_MANY: '{count} questions are unanswered. You can send them as they are.',
    ALL_ANSWERED: 'Every question has an answer.',
    DRAFT_KEPT: 'Your answers are kept on this device as you write.',
    RETURN: 'Return to the reading',

    OFFLINE:
      'The connection dropped before your answers were sent. They are still here — try again when you are back online.',
    SLOW: 'This is taking longer to send than expected. Your answers are still here — you can try again.',
    TOO_MANY:
      'Several submissions have already been sent from this device. Your answers are still here — try again in a little while.',
    REFUSED:
      'These answers could not be accepted as written. They are still here — shortening a long answer usually helps.',
    ALREADY_SENT: 'Your observations have already been received. Thank you.',
    CLOSED: 'The questionnaire is not open at the moment.',
  },

  NAV: {
    LABEL: 'Reading room controls',
    PATHS: 'Choose Your Path',
    SETTINGS: 'Reading settings',
    SOUND: 'Sound',
    SHARE: 'Share',
  },

  NOTICES: {
    ROOM_SLOW: 'The room is taking a moment to open. You can try again.',
    ROOM_SLOW_RETRY: 'Try again',
    NO_WEBGL: 'This device will show the manuscript without the surrounding scene.',
  },

  HINTS: {
    reading_controls: 'Arrow keys and space scroll. Enter continues at the end of a section.',
    reading_settings: 'Text size, motion and sound can be adjusted at any time.',
    reading_place: 'Your place is kept on this device. You can leave and return.',
  },

  ADMIN: {
    SHELL: {
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
      RESPONSES: 'Test Questionnaire',
      METRICS: 'Funnel metrics',
      AUDIT: 'Audit log',
    },

    AUTH: {
      HEADING: 'Operations sign-in',
      INTRO: 'An email address, a password and a six-digit authenticator code are all required.',
      INTRO_LOCAL: 'Enter the operations name and password.',
      EMAIL: 'Email address',
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
      NOT_APPLICABLE: '—',
    },

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

      SUMMARY_HEADING: 'Across these responses',
      SUMMARY_TOTAL: 'Returned',
      SUMMARY_RATINGS: 'Scaled questions',
      SUMMARY_RATINGS_EMPTY: 'No scaled question has been answered yet.',
      SUMMARY_AVERAGE: 'Average',
      SUMMARY_ANSWERED: '{count} answered',
      DISTRIBUTION_LABEL: '{count} rated this {rating} out of 5.',

      CONSENT_HEADING: 'Permission to quote',
      CONSENT_GRANTED: 'Granted',
      CONSENT_DECLINED: 'Declined',
      CONSENT_NOT_ANSWERED: 'Not answered',

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
      UNKNOWN_QUESTION: 'This question is no longer part of the instrument.',
      INSTRUMENT_MISSING:
        'The instrument these answers were given against is no longer stored, so the questions cannot be shown beside them.',
    },

    METRICS: {
      HEADING: 'Funnel metrics',
      INTRO:
        'Session counts across the S0–S14 ladder. Aggregate only: there is no per-reader view anywhere in this panel.',
      RANGE_HEADING: 'Date range',
      COLUMN_STATE: 'State',
      COLUMN_EVENT: 'Event',
      COLUMN_SESSIONS: 'Sessions',
      COLUMN_STEP: 'Step conversion',
      COLUMN_CUMULATIVE: 'Cumulative conversion',
      SKIP_NOTE: 'Skip is a legitimate path. This panel measures pacing, not obedience.',
      BAR_LABEL: 'Share of the first step',
      EMPTY: 'No sessions recorded in this range.',
    },

    AUDIT: {
      HEADING: 'Audit log',
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
