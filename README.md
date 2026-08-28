# Scout AI

Build a production-quality enterprise web application called Digital Scout for Contoso.

Product Goal

Digital Scout modernizes Contoso’s Technology Scout process into an AI-driven engineering discovery platform.

Today, Contoso Technology Scouts receive technology needs from Product Service Lines (PSLs), manually research companies and technologies, collect feedback through email/files, and return recommendations.

The existing process relies heavily on Power Apps/Appian, SharePoint, manual forms, manual research, and knowledge held by individual scouts.

The new experience should make technology scouting part of everyday engineering work and be usable by approximately 2,000 Contoso engineers and technologists, not just the Scout organization.

This should NOT look like a generic CRM, SharePoint replacement, or traditional form application.

The primary experience should feel like:

“Tell Digital Scout what problem you are trying to solve, and let AI help you find what Contoso already knows, what exists externally, and what should happen next.”

Core Design Principles

AI first, forms second

Prefer conversational intake over long forms.

AI should extract structured information from natural-language conversations.

Users should always be able to review/edit what AI extracted.

Knowledge reuse

Before creating a new technology need, surface related existing needs, evaluations, companies, projects, and reports.

Prevent engineers from repeating work Contoso has already performed.

Traceability
Everything should connect across the lifecycle:
Technology Need → Company → Evaluation → Project → Test Report

Engineering-first
This is used for much more than IT.
Example categories include:

Chemicals

Materials and coatings

Sensors

Electronics

Water treatment

Power systems

AI/ML

Automation

Engineering technologies

Scientific technologies

Azure-native architecture
The application and all backend services should be designed to run on Microsoft Azure.

Azure Architecture

Design the application assuming this backend architecture.

Identity

Use:

Microsoft Entra ID

Contoso corporate identities

Role-based access control

Roles:

Engineer / Technologist

Technology Scout

PSL Leader

Evaluator / Subject Matter Expert

Administrator

AI

Use Azure AI Foundry as the AI platform.

Digital Scout should use AI agents for:

Conversational technology-need intake

Requirement extraction

Technology classification

Duplicate/similar need detection

Knowledge retrieval

Company/vendor matching

Evaluation summarization

Engineer feedback summarization

Research assistance

Recommendation generation

Follow-up question generation

Test report summarization

Architect the UX as if multiple specialized AI agents may eventually exist behind the application.

Example agents:

Need Definition Agent
Helps an engineer turn an initial idea/problem into a well-defined technology need.

Knowledge Agent
Searches Contoso’s existing technology scouting knowledge.

Company Discovery Agent
Identifies potentially relevant companies and technologies.

Evaluation Agent
Summarizes evaluations and compares alternatives.

Scout Agent
Acts as the main orchestration agent across the scouting lifecycle.

Enterprise Search / RAG

Use:

Azure AI Search

The search/indexing layer should support information from:

Existing technology needs

Company profiles

Technology evaluations

Engineer feedback

SharePoint documents

Test reports

Project documents

Scout notes

The UX should clearly distinguish between:

Contoso internal knowledge

and

Externally discovered information

AI answers should show source references wherever possible.

Data

Use Azure-native backend services.

Recommended architecture:

Azure Database for PostgreSQL for structured application data

Azure Blob Storage / ADLS for documents and reports

Azure AI Search for semantic/vector search

Azure Functions or Azure Container Apps for backend APIs and agent orchestration

Azure Service Bus / Event Grid for asynchronous workflows and notifications

Azure Key Vault for secrets

Azure Monitor / Application Insights for observability

Design API/service abstractions so the UI is not tightly coupled to mock data.

Microsoft 365 Integration

Design for future integration with:

Microsoft Teams

Microsoft Copilot

SharePoint

Microsoft Graph

Outlook notifications

Digital Scout should eventually be accessible from both the web application and Teams/Copilot.

Main Application Experience

Create a desktop-first responsive enterprise application.

Do NOT build a marketing landing page.

After authentication, immediately take the user into the Digital Scout workspace.

Use a modern Microsoft enterprise aesthetic:

clean

highly polished

information dense without feeling crowded

subtle Contoso red accents

neutral backgrounds

excellent typography

cards only where useful

avoid excessive gradients

avoid giant hero banners

avoid generic startup/SaaS styling

Use a persistent left navigation.

Navigation:

Home

Ask Digital Scout

Technology Needs

Companies

Evaluations

Projects

Knowledge

Following

Scout Workspace

Admin

At the top include global semantic search:

“Search needs, companies, evaluations, projects, reports…”

Also provide a prominent:

Ask Digital Scout

button.

1. Home / My Scout Dashboard

Build a personalized dashboard.

Greeting:

Good morning, Sarah

Subheading:

What technology problem are you trying to solve?

Immediately show an AI input box:

Describe a technology challenge, search for something Contoso has evaluated, or ask Digital Scout a question…

Suggested examples:

“We need a coating that can survive high-temperature H₂S environments.”

“Has Contoso evaluated alternatives to lithium batteries for downhole sensors?”

“Find companies working on produced-water treatment.”

“What technologies have we evaluated for methane detection?”

“Show me technologies related to autonomous wellsite operations.”

Underneath, show sections:

Needs requiring attention

Technology needs owned/followed by the user.

Show:

title

PSL

category

owner

status

last activity

age

recommended next action

Clearly flag stale items.

Example:

High Temperature Corrosion Resistant Coating

Drilling & Evaluation
Materials & Coatings

Last meaningful activity: 147 days ago

AI badge:

Potentially stale

Action:

Review with Digital Scout

Recommended for you

AI-generated technologies, companies, evaluations, or needs based on:

user PSL

expertise

followed topics

recent activity

Knowledge resurfaced

Show older Contoso work that may be useful now.

Example:

Contoso evaluated 4 companies addressing similar requirements in 2023.

Button:

View previous evaluations

This section is important because knowledge reuse is one of the primary product outcomes.

Activity

Recent events:

Company evaluation completed

Engineer added feedback

New company matched to followed need

Test report uploaded

Technology need changed status

New external development detected

2. Ask Digital Scout

This is one of the main experiences.

Create a full conversational AI interface similar to a high-end enterprise Copilot.

Left side:
conversation history.

Main area:
AI conversation.

Right contextual panel:
dynamic context associated with the conversation.

Example user:

We are looking for a new sensor technology capable of operating above 200°C downhole.

Digital Scout responds conversationally:

I found 7 related technology needs and 12 previous company evaluations. Before creating another request, let’s determine whether any of those already address this problem.

Show inline cards for:

related needs

evaluated companies

prior projects

test reports

Then AI asks:

What pressure range does the sensor need to support?

As conversation progresses, show a live Technology Need Draft in the right panel.

Extract:

Problem statement

PSL

Technology category

Technical requirements

Operating environment

Constraints

Desired outcome

Timeline

Business impact

Existing approaches

Technology readiness expectation

Keywords

Allow user to edit AI-extracted fields.

At completion show:

Digital Scout has enough information to create this Technology Need.

Buttons:

Create Technology Need

Continue Refining

3. Technology Needs

Create a rich searchable list/table.

Filters:

PSL

Technology category

Status

Scout

Owner

Created date

Last activity

Technology readiness

Strategic priority

Followed by me

Potentially stale

Statuses:

Draft

Scouting

Companies Identified

Evaluation

Pilot / Test

Project

Closed

Archived

Each item should show:

Technology Need
PSL
Category
Scout
Created
Last Activity
Status
Matched Companies
Evaluations
Followers

Add AI signals such as:

Similar need exists

No activity in 180 days

3 newly discovered companies

Previous Contoso evaluation available

4. Technology Need Detail

Create a detailed workspace.

Header:

Technology Need title

Example:

High Temperature Downhole Pressure Sensor

Include:

Status
PSL
Owner
Technology Scout
Followers
Created date
Last updated

Buttons:

Ask Digital Scout

Follow

Add Evaluation

Share in Teams

Create tabs:

Overview

Show:

Problem Statement

Technical Requirements

Business Need

Operating Environment

Constraints

Desired Outcome

Technology Readiness

AI-generated summary.

AI Recommendations

Show:

Best Fit Companies

Rank companies using AI matching.

For each company show:

Company name

Technology

Match score

Why it matches

Requirement coverage

Prior Contoso interaction

Existing evaluations

Risks / gaps

Example:

Novosense Technologies

92% Match

Reasons:

Operating temperature >225°C

Downhole-qualified sensor platform

Existing Contoso evaluation from 2024

Button:

Why this recommendation?

Related Contoso Knowledge

Show:

Related technology needs
Previous evaluations
Projects
Test reports
Engineer feedback
Documents

Use semantic similarity.

Companies

All companies being considered for this need.

Evaluations

Evaluation history.

Activity

Timeline of all lifecycle events.

Documents

Reports and associated SharePoint/Azure documents.

5. Companies

Build an enterprise company/technology intelligence catalog.

There are approximately 500–600 evaluated companies initially.

Search:

Search companies, capabilities, technologies, or problems they solve…

Filters:

Technology domain
Evaluation status
PSL
Country
Technology readiness
Prior Contoso engagement

Cards/table should show:

Company
Technology areas
Contoso evaluations
Related needs
Current status
Last evaluated

6. Company Detail

Example:

Acme Advanced Materials

Show:

Company description

Technology areas

Website

Headquarters

Technology maturity

Contoso relationship

Last evaluated

AI-generated summary:

Why this company matters to Contoso

Tabs:

Overview

Technology

Related Needs

Evaluations

Projects

Documents

Activity

Include:

Contoso Experience

Show previous feedback from multiple engineers.

AI should summarize distributed feedback.

Example:

Digital Scout summary

Across four Contoso evaluations, engineers consistently rated the material performance highly but identified scale manufacturing and lead time as risks.

Then provide source links.

7. Evaluation Workspace

Create a structured evaluation experience.

Do NOT make it feel like a giant form.

Use sections with AI-assisted completion.

Evaluation criteria could include:

Technology fit

Technical maturity

Commercial maturity

Integration complexity

Scalability

Differentiation

Strategic relevance

Risks

Testing requirements

Allow engineers to:

enter comments

upload documents

add test results

attach emails/notes

record recommendations

AI continuously summarizes the evaluation.

Show:

Emerging Recommendation

Example:

Proceed to controlled field test

Confidence: High

Reasons:

Meets 8/9 technical requirements

Technology previously validated at lab scale

Main remaining risk is field durability

8. Traceability / Technology Journey

Create a visual lineage experience.

For any technology, show:

Technology Need
↓
Candidate Companies
↓
Evaluation
↓
Project
↓
Test Report
↓
Outcome

Use an elegant timeline / relationship graph.

Users should be able to understand:

“What happened to this technology after scouting?”

Example:

High Temperature Sensor Need

→ Sensatek identified

→ Technical evaluation completed

→ Field test funded

→ Permian pilot executed

→ Test report uploaded

→ Technology approved for product integration

This traceability is a major feature.

9. Knowledge Search

Create a dedicated semantic knowledge explorer.

Search prompt:

Search everything Contoso knows about a technology…

Example query:

Produced water membrane technologies

Results should organize automatically into:

Technology Needs

Companies

Evaluations

Projects

Test Reports

Documents

People / Experts

AI Summary

At the top display:

Digital Scout Summary

with citations to internal sources.

10. Following / Notifications

Users should be able to follow:

Technology needs

Companies

Technologies

Keywords/topics

Projects

Example notifications:

A new company matching your hydrogen embrittlement technology need was identified.

A Technology Need you follow has not received activity in 120 days.

A new test report was added to a company you follow.

Three Contoso engineers evaluated a technology related to autonomous drilling this month.

11. Scout Workspace

Technology Scouts need a more advanced operational view.

Dashboard cards:

Strategic Needs
Needs without Scout activity
New submissions
Needs awaiting evaluation
Companies requiring review
Evaluations awaiting feedback
Recently discovered companies
Potential duplicate needs

Show analytics:

120 Strategic Technology Needs

563 Evaluated Companies

38 Active Scout Engagements

17 Evaluations in Progress

9 Technologies in Pilot

4 Technologies Converted to Projects

Do not over-focus on analytics. The main objective is helping scouts take action.

12. Stale Technology Need Detection

Build an AI workflow specifically for stale needs.

Example:

Digital Scout Review

This technology need was created 14 months ago and has had no significant activity for 167 days.

Digital Scout suggests:

Requirement may still be valid

3 new companies have entered this technology area

Similar technology was recently evaluated by another PSL

Actions:

Refresh Need

Ask Owner

Merge With Existing Need

Close

13. Create Need

Provide TWO options.

Option 1 — Talk to Digital Scout

Primary/default.

Conversational intake.

Option 2 — Manual Entry

Secondary.

Keep manual entry available for experienced scouts.

14. AI Transparency

Every AI-generated recommendation should have:

Why am I seeing this?

Allow users to inspect:

matched requirements

knowledge sources

previous evaluations

similarity signals

confidence

Do not make the AI appear magical or opaque.

15. Demo Data

Populate the prototype with realistic Oil & Gas / engineering examples.

Include technology needs such as:

High-temperature downhole sensors

Hydrogen resistant pipeline coatings

Produced water treatment

Methane leak detection

Autonomous wellsite inspection

High density energy storage

Subsea power systems

Carbon capture materials

Drilling automation

Advanced cement additives

Create approximately:

15 Technology Needs

25 Companies

20 Evaluations

8 Projects

10 Test Reports

realistic activity

users from multiple Product Service Lines

Do NOT use lorem ipsum.

16. Architecture Awareness in the UI

Create the application so backend adapters/services can later connect to Azure.

Organize the frontend service layer around APIs such as:

/api/needs

/api/companies

/api/evaluations

/api/projects

/api/reports

/api/search

/api/agents/scout

/api/agents/need-definition

/api/recommendations

/api/notifications

Do not hardcode Azure credentials, endpoints, subscription IDs, or secrets.

Use environment variables.

For the initial prototype, mock responses behind a clean API abstraction so they can later be replaced with Azure services.

17. Future AI Agent Architecture

Design the application assuming Azure AI Foundry will orchestrate the intelligence layer.

Conceptual flow:

User / Teams / Copilot

↓

Digital Scout Web Experience

↓

Azure-hosted API Layer

↓

Digital Scout Orchestrator Agent

↓

Specialized Agents

Need Definition Agent

Contoso Knowledge Agent

Company Research Agent

Evaluation Agent

Recommendation Agent

↓

Azure AI Search + Contoso Data

↓

PostgreSQL / SharePoint / Blob Storage / Project & Test Data

The application should visually reinforce this concept through the experience without exposing unnecessary infrastructure details to normal users.

Most Important User Story

The strongest demo flow should be:

An engineer logs in and types:

“I need a coating for a downhole tool operating in an H₂S environment above 180°C.”

Digital Scout:

Understands the request.

Asks several intelligent clarification questions.

Extracts the technical requirements.

Searches Contoso's previous technology work.

Finds similar technology needs.

Shows previously evaluated companies.

Shows relevant test reports.

Identifies gaps between the new requirement and previous work.

Suggests external companies/technologies worth investigating.

Creates a structured Technology Need.

Allows the engineer to follow the need.

Routes it into the Technology Scout workflow.

Maintains complete traceability as the technology progresses through evaluation, testing, project funding, and potential product adoption.

Build this flow first and make it exceptional.

Product Message

The product should communicate one simple idea throughout the experience:

Contoso should never have to rediscover what Contoso already knows.

Digital Scout captures engineering knowledge, combines it with external technology intelligence, and uses AI to help engineers move from a technology problem to an in

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
