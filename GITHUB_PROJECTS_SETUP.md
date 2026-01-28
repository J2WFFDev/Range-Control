# GitHub Projects Setup Guide

This guide explains how to set up GitHub Projects for managing the Range-Control Railway deployment.

---

## Step 1: Create GitHub Project

1. Go to your repository: `https://github.com/J2WFFDev/Range-Control`
2. Click **"Projects"** tab
3. Click **"New project"**
4. Choose **"Board"** view
5. Name it: **"Range-Control Railway Deployment"**

---

## Step 2: Configure Board Columns

Set up the following columns for Kanban workflow:

### Recommended Columns

1. **📋 Backlog**
   - All new issues start here
   - Unrefined and not yet prioritized

2. **📝 Ready**
   - Issues that are refined and ready for work
   - Acceptance criteria defined
   - Dependencies resolved

3. **🏗️ In Progress**
   - Active work being done
   - Limit: 3-5 items per developer

4. **👀 In Review**
   - Code review in progress
   - PR created and awaiting approval

5. **✅ Testing**
   - Deployed to staging
   - QA/testing in progress

6. **✨ Done**
   - Completed and deployed to production
   - Closed issues

---

## Step 3: Set Up Automation

### Auto-move Cards

1. Click **"⋯"** on each column
2. Select **"Manage automation"**
3. Configure:

**Ready → In Progress**
- When: Issue assigned
- Then: Move to "In Progress"

**In Progress → In Review**
- When: Pull request opened
- Then: Move to "In Review"

**In Review → Testing**
- When: Pull request merged
- Then: Move to "Testing"

**Testing → Done**
- When: Issue closed
- Then: Move to "Done"

---

## Step 4: Create Labels

Set up these labels for better organization:

### Epic Labels
- `epic` - Red - For epic tracking issues

### Priority Labels
- `priority: critical` - Dark red - Must be done immediately
- `priority: high` - Orange - Important, next in queue
- `priority: medium` - Yellow - Normal priority
- `priority: low` - Green - Nice to have

### Type Labels
- `user-story` - Blue - User stories
- `task` - Purple - Technical tasks
- `bug` - Red - Bug reports
- `enhancement` - Light blue - Feature enhancements
- `documentation` - Gray - Documentation updates

### Epic-Specific Labels
- `epic: infrastructure` - For EPIC 1
- `epic: backend` - For EPIC 2
- `epic: database` - For EPIC 3
- `epic: frontend` - For EPIC 4
- `epic: devops` - For EPIC 5
- `epic: production` - For EPIC 6

### Status Labels
- `status: blocked` - Red - Blocked by dependencies
- `status: needs-discussion` - Yellow - Needs team discussion
- `status: ready-for-review` - Green - Ready for review

---

## Step 5: Create Initial Issues

### Create Epic Issues

Use the Epic template to create 6 epic issues:

1. **[EPIC] Railway Infrastructure Setup**
2. **[EPIC] API/Backend Development**
3. **[EPIC] Database Integration**
4. **[EPIC] Frontend Development**
5. **[EPIC] Deployment & DevOps**
6. **[EPIC] Production Readiness**

### Create Initial User Stories

For each epic, create the corresponding user stories from `PROJECT_PLANNING.md`:

Example for EPIC 1:
- **[STORY] Railway Project Initialization**
- **[STORY] Environment Configuration**
- **[STORY] Domain and SSL Setup**

---

## Step 6: Add Issues to Project

1. Go to each created issue
2. On the right sidebar, under **"Projects"**
3. Click **"Add to project"**
4. Select your project board
5. Issue will appear in **Backlog** column

---

## Step 7: Set Up Milestones

Create milestones for each phase:

### Phase 1: Foundation (Weeks 1-3)
- Due date: 3 weeks from start
- Issues: EPIC 1, EPIC 3 (parts 1-3), EPIC 2 (parts 1-2)

### Phase 2: Core Features (Weeks 4-7)
- Due date: 7 weeks from start
- Issues: EPIC 2 (parts 3-6), EPIC 3 (parts 4-5), EPIC 4 (parts 1-3)

### Phase 3: Advanced Features (Weeks 8-10)
- Due date: 10 weeks from start
- Issues: EPIC 4 (parts 4-6), EPIC 5

### Phase 4: Production Readiness (Weeks 11-13)
- Due date: 13 weeks from start
- Issues: EPIC 6, final testing

---

## Step 8: Project Views

### Create Additional Views

1. **By Epic View**
   - Group by: Epic label
   - Sort by: Priority

2. **By Assignee View**
   - Group by: Assignee
   - Sort by: Due date

3. **Sprint View** (if using sprints)
   - Filter by: Current sprint milestone
   - Sort by: Priority

4. **Roadmap View**
   - Group by: Milestone
   - Layout: Timeline

---

## Step 9: Team Workflow

### Daily Workflow

1. **Morning Standup**
   - Review "In Progress" column
   - Move completed items to "In Review"
   - Pick new items from "Ready"

2. **Development**
   - Update issue with progress comments
   - Link commits to issues using `#issue-number`
   - Create PR when ready

3. **Code Review**
   - Reviewer checks "In Review" column
   - Approve or request changes
   - Merge when approved

4. **Deployment**
   - Verify on staging (auto-deploys from develop)
   - Move to "Testing"
   - QA validates
   - Deploy to production
   - Close issue → moves to "Done"

---

## Step 10: Sprint Planning (Optional)

If using 2-week sprints:

### Sprint Planning Meeting

1. Review backlog with team
2. Refine user stories
3. Estimate effort (story points)
4. Commit to sprint goal
5. Move issues to "Ready" column
6. Assign to milestone

### Sprint Cadence

- **Sprint Duration**: 2 weeks
- **Sprint Planning**: Monday Week 1
- **Daily Standups**: Every morning (15 min)
- **Sprint Review**: Friday Week 2
- **Sprint Retro**: Friday Week 2 (after review)

---

## Best Practices

### Issue Management

✅ **DO:**
- Keep issues small and focused
- Update issues regularly
- Link PRs to issues
- Use descriptive titles
- Add acceptance criteria
- Assign due dates

❌ **DON'T:**
- Create duplicate issues
- Leave stale issues open
- Assign too many issues to one person
- Skip testing steps

### Project Board

✅ **DO:**
- Review board daily
- Keep "In Progress" column limited
- Archive completed issues weekly
- Update issue status in comments

❌ **DON'T:**
- Let cards get stuck
- Bypass the workflow
- Ignore blocked items
- Skip code review

---

## Example Issue Creation

### Creating EPIC 1

```markdown
Title: [EPIC] Railway Infrastructure Setup

Labels: epic, epic: infrastructure, priority: high

Body:
## Epic Overview
Set up the foundational Railway infrastructure and configuration for deploying the Range-Control booking system.

## Business Value
Establishes the deployment platform enabling continuous delivery and production hosting.

## User Stories
- [ ] #XX - Railway Project Initialization
- [ ] #XX - Environment Configuration  
- [ ] #XX - Domain and SSL Setup

## Success Criteria
- [ ] Railway project created and linked to GitHub
- [ ] Three environments configured (dev, staging, prod)
- [ ] Custom domain with SSL certificate working
- [ ] Automatic deployments functioning

## Timeline
Start Date: [Today's date]
Target Completion: Week 3
```

### Creating User Story 1.1

```markdown
Title: [STORY] Railway Project Initialization

Labels: user-story, epic: infrastructure, priority: high

Body:
## User Story
**As a** DevOps engineer
**I want to** initialize a Railway project
**So that** we have a deployment platform for the application

## Acceptance Criteria
- [ ] Railway project created via dashboard
- [ ] Environment variables configured
- [ ] Service connected to GitHub repository  
- [ ] Automatic deployments enabled
- [ ] First successful deployment verified

## Technical Notes
- Use Railway's Python buildpack
- Configure DATABASE_URL for PostgreSQL
- Set up health check endpoint at /health

## Epic
Part of #XX - [EPIC] Railway Infrastructure Setup

## Estimated Effort
2 hours
```

---

## Monitoring Progress

### Weekly Review

Check these metrics:
- **Velocity**: Story points completed per sprint
- **Cycle Time**: Time from "In Progress" to "Done"
- **Blocked Items**: Items stuck in workflow
- **Bug Rate**: New bugs vs features

### Reports

GitHub Projects provides:
- Burndown charts (Insights tab)
- Velocity trends
- Issue completion rate
- Time in each column

---

## Resources

- **GitHub Projects Docs**: https://docs.github.com/en/issues/planning-and-tracking-with-projects
- **Agile Best Practices**: https://www.atlassian.com/agile/project-management
- **Issue Templates**: Already created in `.github/ISSUE_TEMPLATE/`

---

## Quick Commands

### CLI Commands for Issue Management

```bash
# Install GitHub CLI
brew install gh  # macOS
# or
apt install gh   # Linux

# Create issue from template
gh issue create --template user-story

# List issues
gh issue list

# Close issue
gh issue close <issue-number>

# Assign issue
gh issue edit <issue-number> --add-assignee @me

# Add to project
gh issue edit <issue-number> --add-project "Range-Control Railway Deployment"
```

---

## Next Steps

1. [ ] Create GitHub Project board
2. [ ] Set up columns and automation
3. [ ] Create labels
4. [ ] Create 6 epic issues
5. [ ] Create first wave of user stories (EPIC 1)
6. [ ] Add team members as collaborators
7. [ ] Hold sprint planning meeting
8. [ ] Start development!

---

**Happy Project Management! 📊**
