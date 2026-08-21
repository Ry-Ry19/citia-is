# CITIA-IS Development Plan

## 1. Project

**System:** CITIA-IS  
**Full Name:** Community-Driven Invasive Tree Identification and Recommendation Management Information System

## 2. Development Methodology

Agile-Scrumban

### Workflow

Backlog → Ready → In Progress → Review/Test → Done

**WIP Limit:** 2 active development tasks

## 3. Technology Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend

- Python
- FastAPI

### Database

- PostgreSQL

### AI

- YOLOv8

### Development Tools

- Git
- GitHub
- GitHub Projects
- Google Colab
- Roboflow
- Postman
- Miro
- Google Sheets

## 4. Development Stages

### Stage 3 — System Design and Architecture

- [ ] Finalize system architecture
- [ ] Finalize database design
- [ ] Define API structure
- [ ] Build high-fidelity UI directly in Next.js

### Stage 4 — Dataset and AI Development

- [ ] Collect approximately 500 original Mahogany images
- [ ] Collect non-Mahogany/background negative samples
- [ ] Verify image quality
- [ ] Annotate Mahogany images
- [ ] Prepare dataset
- [ ] Train YOLOv8
- [ ] Evaluate model
- [ ] Document AI results

### Stage 5 — System Development and Integration

- [ ] Build community frontend
- [ ] Build admin frontend
- [ ] Develop FastAPI backend
- [ ] Implement PostgreSQL database
- [ ] Implement image upload
- [ ] Integrate YOLOv8
- [ ] Retrieve ecological information
- [ ] Retrieve management recommendations
- [ ] Implement community reports
- [ ] Connect frontend, backend, AI, and database

### Stage 6 — Testing and Evaluation

- [ ] Functional testing
- [ ] API testing
- [ ] AI performance testing
- [ ] Negative-input testing
- [ ] Integration testing
- [ ] Responsive testing
- [ ] Usability testing

### Stage 7 — Review and Feedback

- [ ] Collect stakeholder feedback
- [ ] Record issues
- [ ] Prioritize revisions

### Stage 8 — Refinement and Continuous Improvement

- [ ] Fix identified issues
- [ ] Refine UI/UX
- [ ] Refine AI model if required
- [ ] Retest
- [ ] Final validation
- [ ] Final documentation

## 5. Core Community User Workflow

→ Dashboard/Landing page
→ Capture/Upload Image
→ Image Preview
→ Processing
→ YOLOv8 Detection
→ Result

### If Mahogany is detected

Mahogany Detected
→ Ecological Information
→ Management Recommendation

### If Mahogany is not detected

Mahogany Not Detected
→ Inform User That the Target Species Was Not Detected

## 6. Core System Architecture

Next.js
→ FastAPI
→ YOLOv8
→ PostgreSQL
→ Ecological Information / Management Recommendation
→ FastAPI
→ Next.js

## 7. Development Principle

Build the system incrementally using vertical slices.

Each major feature should progress through:

Requirement
→ Design
→ Implementation
→ Testing
→ Review
→ Commit
→ Done

## 8. Definition of Done

A task is considered complete when:

- [ ] Requirement is implemented
- [ ] Function works as intended
- [ ] Tested locally
- [ ] Errors are handled
- [ ] Code is committed
- [ ] Changes are reviewed
- [ ] Relevant thesis evidence is recorded
