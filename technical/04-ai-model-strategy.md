# AI Model Strategy

Reference document covering model selection, recommended stack, fine-tuning roadmap, and legal/compliance context for AI usage in Aura / Ora.

Last updated: 2026-05-26

---

## What AI Does in This Product

| Use Case | Description | Stakes |
|---|---|---|
| Match explanation generation | Natural language copy explaining why two users are compatible | High: this IS the user-facing product moment |
| Compatibility scoring | Ranking and scoring user pairs from embedded profiles | High: drives who gets shown to whom |
| Embedding generation | Converting profile text into vectors for similarity search | Medium: one-time per user, background |
| Place / activity suggestions | Suggesting venues and plans that fit a match | Medium: enhances the plan but not core |
| Icebreaker generation | Conversation starters tailored to a match pair | Low: optional, easily ignored |

---

## Model Comparison for Aura's Use Cases

Ratings are for the specific tasks above, not general benchmarks.

| Model | Personality Understanding | Explanation Quality | Instruction Following | Embeddings Available | Est. Output Cost /1M tokens | Overall for Aura |
|---|---|---|---|---|---|---|
| **Claude Sonnet 3.7** (Anthropic) | 9/10 | 9.5/10 | 9/10 | No (use OpenAI separately) | ~$15 | **9/10** |
| **GPT-4o** (OpenAI) | 8.5/10 | 8.5/10 | 9/10 | Yes (text-embedding-3-large) | ~$10 | **8.5/10** |
| **Claude Haiku 3.5** (Anthropic) | 7/10 | 7.5/10 | 8/10 | No | ~$4 | **7/10** |
| **GPT-4o mini** (OpenAI) | 6.5/10 | 7/10 | 7.5/10 | Yes (text-embedding-3-small) | ~$0.60 | **6.5/10** |
| **Gemini 2.0 Flash** (Google) | 7/10 | 7/10 | 7.5/10 | Yes | ~$0.40 | **7/10** |
| **Gemini 1.5 Pro** (Google) | 7.5/10 | 7.5/10 | 8/10 | Yes | ~$5 | **7.5/10** |
| **LLaMA 3.3 70B** (Meta, open weights) | 7/10 | 7/10 | 7.5/10 | Via separate model | ~$0.80 via API / ~$0 self-hosted | **7/10 now, higher future potential** |
| **Mistral Large** | 6.5/10 | 6.5/10 | 7/10 | Via separate model | ~$6 | **6/10** |

### Key observations

- Claude Sonnet leads on explanation quality, which matters most for Aura because the match explanation is the emotional core of the product experience. It is warmer and more nuanced than GPT-4o for this specific task.
- GPT-4o's practical advantage is ecosystem: embeddings, generation, and structured outputs in one provider. This simplifies the stack but is not a good enough reason to compromise explanation quality.
- LLaMA's current quality is good but not best-in-class. Its strategic value is long-term: it is the only model in this list that can be fine-tuned on proprietary data. See the fine-tuning section below.
- Gemini 2.0 Flash is worth watching. It is improving fast and is very cheap. Not ready for primary matching explanations yet.

---

## Recommended Stack

### MVP and early growth

| Task | Model | Reason |
|---|---|---|
| Match explanations | Claude Sonnet 3.7 | Best explanation quality for the core product moment |
| Compatibility reasoning | Claude Sonnet 3.7 | Nuanced reasoning about personality fit |
| Embeddings | OpenAI text-embedding-3-large | Best quality for ANN similarity search; Claude has no native embedding model |
| Icebreakers and summaries | Claude Haiku 3.5 or GPT-4o mini | 10-15x cheaper; quality is sufficient for low-stakes copy |
| Structured match data output | GPT-4o with JSON schema mode | Best structured output reliability if you need scores as typed objects |

Running two providers (Anthropic + OpenAI) is two API keys and a clean interface split. It is not complicated and the quality difference on explanations justifies it.

### At scale (Series A+)

Evaluate moving high-volume, lower-stakes tasks to LLaMA self-hosted or via Groq/Together. By that stage you should also have enough outcome data to begin fine-tuning. See below.

---

## Fine-Tuning Roadmap: The LLaMA Path

### The strategic case

No closed-API model (Claude, GPT-4o, Gemini) allows fine-tuning on proprietary data in a way that produces a model you own. LLaMA is open weights: you can fine-tune it, host it, and the resulting model is yours.

As Aura accumulates match outcome data (who accepted, whether a date happened, how users rated the experience), that data becomes a proprietary training signal for human compatibility. Over time, a LLaMA model fine-tuned on real Aura outcomes would outperform any general-purpose model on Aura's specific task, because the training signal is clean and purpose-built.

This is a meaningful long-term moat. General models are trained to understand language. A fine-tuned Aura model would be trained to understand compatibility.

### What triggers this conversation

Consider starting fine-tuning work when:
- You have 10,000+ completed match cycles with outcome ratings
- Match acceptance rates or user satisfaction scores plateau with the current model
- AI costs become a significant line item and self-hosting becomes economical

### What the training signal looks like

Good training data for this use case:
- Profile pair + compatibility score + explanation + outcome (accepted / met / rated positively)
- Profile pair + explanation + user feedback ("this felt wrong about me")

Noisy or low-value training data to exclude:
- Matches that were shown but never interacted with (no signal)
- Matches rejected for availability reasons rather than compatibility

### Cross-industry potential

A model trained on genuine human compatibility signals is not limited to social matching. Potential adjacent applications once the model has depth:
- Team formation (compatibility in work styles and communication)
- Roommate and co-founder matching
- Therapist-patient fit
- Mentorship pairing

This is a separate product line, not an MVP concern. But it is worth keeping in mind when designing the data model: store outcome signals in a way that is queryable and exportable for future training runs.

---

## On the "Social Data = Better Matching" Misconception

A common assumption is that Meta's LLaMA, being trained by Facebook, must have an advantage for social matching because Facebook knows human connection.

**This is not accurate.**

LLaMA is trained on Common Crawl (public web text), Wikipedia, books, and code. It is not trained on Facebook's social graph, private messages, or user behavioral data. Meta keeps that data separate for legal and regulatory reasons. Using Facebook user data to train a publicly released model would violate GDPR, CCPA, and Meta's own FTC consent agreements.

The internal recommendation models Meta uses for Facebook's feed are entirely separate systems and are not publicly available.

Even if Meta could use Facebook data for LLaMA, it would not necessarily produce a better matching model. Facebook behavioral data is noisy as a compatibility signal: you interact with people you would never date, you engage with irrelevant content, and the graph conflates friends, family, and colleagues. Aura's eventual training data is purpose-specific: real people, real compatibility decisions, real outcomes. That is a cleaner signal for the task.

---

## Analogous Case: X (Twitter) and Grok

X trains Grok on user tweet data to improve the X product experience. This is structurally the same as what Aura plans to do with its match outcome data.

The key elements that make it legally defensible:
- The data stays within the company's own AI, not released as a public model
- X updated their Terms of Service to disclose AI training use before doing it
- Tweets are largely public content (lower privacy expectation than private messages)

Where X got it wrong:
- In the EU, the Irish DPC ordered X to stop using EU user data because they did not obtain consent *before* the ToS change. Retroactive consent does not satisfy GDPR.
- In the US, largely permissible after the ToS update.

**The lesson for Aura:** X's structure is the right model. The execution should be more transparent. Given that match preference data is sensitive and intimate, a specific onboarding consent step is better practice than a ToS change. Something explicit: "We use anonymised match outcome data to improve future recommendations. You can opt out here." This is cleaner than what X did and defensible in Canada and the US, including California.

---

## Legal and Compliance Reference (North America Focus)

### United States

| Concern | Status | Action needed |
|---|---|---|
| Federal AI regulation | None currently in force | Monitor; design for auditability anyway |
| CCPA / CPRA (California) | Applies to any US product | Disclose AI profiling; provide opt-out for sensitive data processing; honor deletion requests including embeddings |
| FTC deceptive practices | Active enforcement on AI claims | Do not overstate match accuracy or AI capabilities in marketing |
| COPPA (under 13) | Strict | Hard age gate at signup |
| Anti-discrimination | No specific AI law, but FTC and civil rights frameworks apply | Audit match explanation patterns for protected characteristic bias periodically |

### Canada

| Concern | Status | Action needed |
|---|---|---|
| PIPEDA (federal) | In force | Meaningful consent, access rights, purpose limitation |
| Bill C-27 / CPPA (federal update) | Advancing through Parliament as of 2026 | Includes right to explanation for automated decisions; design for it now even though not yet law |
| Quebec Law 25 | In force | Privacy impact assessment before launch; explicit consent; right to de-indexing; treat Quebec users with GDPR-equivalent care |

### What you are more freely allowed to do in North America vs EU

- AI profiling without a separate explicit consent layer (outside California sensitive data and Quebec)
- No mandatory DPIA at the federal level (Quebec is the exception)
- No EU AI Act high-risk classification risk
- No conformity assessment or algorithmic audit before launch

### What survives regardless of jurisdiction

- Embeddings are personal data: users must be able to delete them on account deletion
- Consent language in ToS must cover AI-based profiling explicitly
- Do not include full names, contact information, or unfiltered free text in AI prompts
- Pin model versions and test before upgrading: output quality changes are invisible regressions

---

## Operational Cost Reference

Rough daily cost estimates based on pricing as of early 2026. Assumes explanations are cached per match pair and not regenerated on every page load.

| Scale | Daily AI calls | Daily cost (Claude Sonnet) | Daily cost (GPT-4o) | Daily cost (Haiku / 4o mini for aux) |
|---|---|---|---|---|
| 100 DAU x 5 matches | 500 | ~$0.50 | ~$0.40 | ~$0.02 |
| 1,000 DAU x 5 matches | 5,000 | ~$5 | ~$4 | ~$0.20 |
| 10,000 DAU x 5 matches | 50,000 | ~$50 | ~$40 | ~$2 |

These numbers assume ~500 output tokens per explanation. They become unsustainable only if caching is not implemented (regenerating on every page load multiplies costs by ~20x at typical session lengths).

**Hard rules to enforce from day one:**
- Cache every match explanation in the database at generation time
- Only regenerate when a user's profile changes materially
- Use the smaller model for any task where quality parity is acceptable
- Set a hard monthly spend cap with alerts at 50%, 80%, and 100% of budget
