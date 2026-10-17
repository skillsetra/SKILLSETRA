const ENGLISH_QUESTION_BANK = {
  Beginner: [
    "Please introduce yourself and tell me what you enjoy learning.",
    "What do you usually do in a normal day, and what part of your day do you enjoy most?",
    "Tell me about a small task you completed recently. What did you do first?",
    "What is one skill you want to improve this year, and why?",
    "Describe a person who has helped you learn something useful.",
    "What do you like to do when you have free time?",
    "Tell me about a food you enjoy and how you would describe its taste.",
    "What do you do when you do not understand a new word?",
    "Describe your favourite place and explain why you like it.",
    "How do you ask someone for help when a task is difficult?",
    "Tell me about something you learned by watching another person.",
    "What is one thing you did this week that made you feel proud?",
    "Explain how you get ready before leaving home in the morning.",
    "What kind of books, videos, or stories do you enjoy, and why?",
    "Describe a goal you have for next month and one small step you can take.",
  ],
  Basic: [
    "Tell me about a recent project or task you worked on.",
    "How do you usually prepare before starting an important task?",
    "Describe a problem you faced recently and explain how you solved it.",
    "What kind of work do you enjoy doing with other people?",
    "Tell me about something new you learned and how you learned it.",
    "What would you like to achieve in your next job or project?",
    "How do you explain a delay to someone who is waiting for your work?",
    "Describe a time you had to organize several small tasks.",
    "What do you do when instructions are not clear?",
    "Tell me about a useful suggestion someone gave you.",
    "How would you welcome a new teammate to a group?",
    "What helps you stay focused when you are learning something difficult?",
    "Describe a choice you made after comparing two options.",
    "How do you check that you have completed a task correctly?",
    "Tell me about a time you had to explain your idea clearly.",
  ],
  Intermediate: [
    "Tell me about a project you are proud of and explain your contribution.",
    "Describe a time when you had to solve an unexpected problem at work or in a project.",
    "How do you decide what to work on first when you have several priorities?",
    "Tell me about a time you received difficult feedback. What did you do with it?",
    "Explain a technical or professional concept you know well as if you were teaching a new teammate.",
    "Describe a situation where you had to work with someone who disagreed with you.",
    "How do you estimate the effort needed for an unfamiliar task?",
    "Tell me about a mistake you noticed before it caused a larger problem.",
    "How do you decide whether a source of information is trustworthy?",
    "Describe a time you changed your approach after seeing new evidence.",
    "How do you keep others informed when a project's status changes?",
    "Tell me about a task you improved by using a tool or process differently.",
    "What would you do if two teammates gave you conflicting instructions?",
    "How do you know when your work is ready to be reviewed by someone else?",
    "Describe a lesson from a recent experience that changed how you work.",
  ],
  High: [
    "Tell me about a difficult decision you made in a project and what influenced your choice.",
    "How would you explain a complex idea to a stakeholder who is not technical?",
    "Describe a situation where your original plan failed and how you adapted.",
    "How do you balance quality, speed, and business priorities when deadlines are tight?",
    "Tell me about a time you changed your mind after hearing another person's reasoning.",
    "How do you communicate risk when you are not yet certain what will happen?",
    "Describe how you would challenge an assumption without damaging a working relationship.",
    "How do you make a recommendation when the available data is incomplete?",
    "Tell me about a time you helped a group reach a decision under pressure.",
    "How do you decide which feedback to act on first when suggestions conflict?",
    "Describe an improvement you introduced and how you measured its impact.",
    "What would you include in a concise update about a project that is behind schedule?",
    "How do you respond when a stakeholder requests a shortcut that adds risk?",
    "Tell me about a time you had to explain an unpopular but necessary decision.",
    "How would you help a colleague understand a complex change with limited time?",
  ],
  "Advanced / Industry": [
    "Describe a high-stakes trade-off you would discuss with engineering and business stakeholders.",
    "How would you defend a technical recommendation when senior stakeholders strongly disagree?",
    "Tell me about a failure or near-miss and explain what you changed afterward.",
    "How do you communicate uncertainty while still helping a team make a timely decision?",
    "Describe how you would negotiate scope when a deadline cannot move.",
    "What makes technical communication trustworthy when different teams have different priorities?",
    "How would you validate a strategic recommendation when experiments are costly or slow?",
    "Tell me about a time you aligned teams that measured success in different ways.",
    "How would you communicate a serious risk when leadership expects a confident delivery date?",
    "Describe how you would decide whether to standardize a process or allow team autonomy.",
    "How do you turn an ambiguous business objective into measurable acceptance criteria?",
    "What would you do if a successful short-term workaround created long-term operational debt?",
    "How would you handle a disagreement about ownership during a production incident?",
    "Tell me about a decision where you documented uncertainty and later revisited the outcome.",
    "How would you explain the limits of a promising result before it is ready for broader use?",
  ],
};

const ENGLISH_LEVELS = Object.freeze(Object.keys(ENGLISH_QUESTION_BANK));

export function normalizeInterviewQuestion(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const FILLER_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "can", "could", "describe", "do", "does", "explain", "for", "from", "how", "i", "in", "is", "it", "me", "of", "on", "or", "please", "should", "tell", "that", "the", "their", "them", "there", "these", "this", "to", "was", "were", "what", "when", "where", "which", "who", "why", "with", "would", "you", "your"
]);

function bigrams(value) {
  const tokens = normalizeInterviewQuestion(value).split(" ").filter(Boolean);
  const filtered = tokens.filter((token) => !FILLER_WORDS.has(token));
  if (filtered.length < 2) return new Set(filtered);
  const pairs = new Set();
  for (let index = 0; index < filtered.length - 1; index += 1) pairs.add(`${filtered[index]} ${filtered[index + 1]}`);
  return pairs;
}

export function isDuplicateQuestion(candidate, previousQuestions = []) {
  const next = normalizeInterviewQuestion(candidate);
  if (!next) return false;
  return previousQuestions.some((prior) => {
    const priorNormalized = normalizeInterviewQuestion(prior);
    if (!priorNormalized) return false;
    if (next === priorNormalized) return true;
    const shorter = Math.min(next.length, priorNormalized.length);
    if (shorter >= 28 && (next.includes(priorNormalized) || priorNormalized.includes(next))) return true;
    const leftTokens = normalizeInterviewQuestion(next).split(" ").filter((token) => token && !FILLER_WORDS.has(token));
    const rightTokens = normalizeInterviewQuestion(priorNormalized).split(" ").filter((token) => token && !FILLER_WORDS.has(token));
    const leftWords = new Set(leftTokens);
    const rightWords = new Set(rightTokens);
    if (Math.min(leftWords.size, rightWords.size) >= 3) {
      let sharedWords = 0;
      for (const token of leftWords) if (rightWords.has(token)) sharedWords += 1;
      if (sharedWords / Math.min(leftWords.size, rightWords.size) >= 0.84) return true;
    }
    const left = bigrams(next);
    const right = bigrams(priorNormalized);
    if (Math.min(left.size, right.size) < 4) return false;
    let intersection = 0;
    for (const token of left) if (right.has(token)) intersection += 1;
    const union = left.size + right.size - intersection;
    return union > 0 && intersection / union >= 0.78;
  });
}

export function chooseEnglishFallbackQuestion(level, round, previousQuestions = []) {
  const bank = ENGLISH_QUESTION_BANK[level] || ENGLISH_QUESTION_BANK.Intermediate;
  const start = Math.max(0, (Number(round) - 1) % bank.length);
  for (let offset = 0; offset < bank.length; offset += 1) {
    const candidate = bank[(start + offset) % bank.length];
    if (!isDuplicateQuestion(candidate, previousQuestions)) return candidate;
  }
  return null;
}

export { ENGLISH_LEVELS, ENGLISH_QUESTION_BANK };
