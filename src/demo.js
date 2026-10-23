import { normalizeDraft } from './draft.js';

const DESCRIPTION = `<p><b>You don’t need to become a “tech person” to make AI useful.</b></p>
<p>Most AI guides start with a wall of jargon. <i>The Sunday AI Reset</i> starts with your real week: the inbox, the half-finished outline, the family group chat.</p>
<h4>What’s inside</h4>
<ul>
  <li>One gentle, 20-minute practice for each day of the week</li>
  <li>Plain-English explanations of prompts, agents, and local AI</li>
  <li>Checklists for privacy, accuracy, and the moments when AI should stay out of the room</li>
</ul>
<h4>Written for real life</h4>
<p>This is a practical field guide for busy adults, not a race to use every tool. You’ll learn a repeatable way to test AI, keep your data safe, and decide what deserves your own voice.</p>
<p><b>Start small. Keep what helps. Leave the hype on the shelf.</b></p>`;

export function createDemoDraft() {
  return normalizeDraft({
    book: {
      title: 'The Sunday AI Reset',
      subtitle: 'A gentle, practical guide to using AI without losing your weekend',
      author: 'Avery Example',
    },
    description: DESCRIPTION,
    keywords: [
      'beginner AI guide for busy adults',
      'practical AI workbook',
      'plain English AI handbook',
      'AI privacy basics',
      'local AI for beginners',
      'everyday AI skills',
      'tech guide for non-tech people',
    ],
    categories: [
      'Computers & Technology > Artificial Intelligence',
      'Business & Money > Small Business',
      'Self-Help > Time Management',
    ],
    categoryNotes: 'Demo only: browse Amazon for the closest current shelves before choosing categories in KDP.',
    ai: {
      decision: 'disclose',
      generated: {
        text: true,
        images: true,
        translations: false,
      },
      checks: {
        policy: true,
        inventory: true,
        rights: true,
        facts: true,
        revisit: true,
      },
      notes: 'Demo only: AI helped with early outlines and cover concepts. All final text was revised and fact-checked.',
    },
  });
}
