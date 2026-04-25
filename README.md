# Terraria AI Assistant

A free-first AI assistant for Terraria players that helps answer questions, explain progression, and guide players using information grounded in Terraria wiki sources.

## Project Goal

The goal of this project is to build a public, resume-ready AI web app that helps Terraria players ask questions like:

- What should I do after defeating the Eye of Cthulhu?
- How do I craft the Night's Edge?
- What armor should I use before fighting Skeletron?
- What are good early-game accessories for a ranger build?
- How do I prepare for Hardmode?

Instead of relying only on general AI knowledge, the assistant will eventually use Terraria wiki information as its main source of truth.

## Why This Project Exists

Terraria has a lot of items, bosses, crafting paths, NPC conditions, world events, and progression steps. New or returning players often need help understanding what to do next without digging through many separate wiki pages.

This project is meant to act like a helpful guide that can explain options clearly, give context, and point users toward useful next steps.

## Free-First Approach

This project is being built with the intention of staying free for as long as possible.

The first version will focus on:

- Free local development
- Free open-source tools
- Free hosting options when possible
- Simple data storage before adding paid services
- A project structure that can later support stronger AI features

Paid APIs or services may be added later only if they become necessary.

## Planned Features

### Phase 1: Project Foundation

- Create the Next.js app
- Build the first homepage
- Set up Git tracking
- Write project documentation
- Prepare the repo for GitHub

### Phase 2: Basic Chat Interface

- Create a chat page
- Add a message input box
- Display user and assistant messages
- Build a clean Terraria-themed UI

### Phase 3: Wiki Data System

- Collect Terraria wiki content
- Store useful page data locally
- Create a simple search system
- Return relevant wiki snippets for user questions

### Phase 4: AI Response System

- Connect the chat interface to an AI response system
- Use retrieved wiki information to ground answers
- Avoid unsupported guesses when wiki information is missing
- Add citations or source links where possible

### Phase 5: Memory and Personalization

- Save useful conversation context
- Let users keep track of their Terraria world progress
- Remember boss progression, class preference, and current goals
- Keep memory lightweight and optional

### Phase 6: Public Deployment

- Push the project to GitHub
- Deploy the app publicly
- Add screenshots and usage examples
- Polish the README for recruiters and portfolio viewers

## Tech Stack

Current stack:

- Next.js
- TypeScript
- Tailwind CSS
- Git

Planned additions:

- Local JSON or SQLite storage
- Wiki scraping or wiki API access
- Retrieval system for wiki content
- AI model or API integration
- Optional user memory system

## Current Status

The project currently has:

- A working Next.js app
- A custom Terraria AI Assistant homepage
- Git tracking set up locally

More features will be added step by step.