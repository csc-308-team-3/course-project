# ChoreMate Acceptance Criteria Specification

## Feature 1: Weekly Announcements
Status: Implemented

### Scenario: Save an announcement for the selected week

**Given** I am a logged-in member of a household  
**And** I am viewing a selected week on the household chore board  
**When** I enter an announcement and select Save  
**Then** the announcement is saved for my household and selected week  
**And** the saved announcement is displayed on the chore board  

### Scenario: View announcements for different weeks

**Given** my household has announcements saved for two different weeks  
**When** I select a different week from the chore-board week dropdown box  
**Then** I see the announcement saved for that selected week  
**And** I do not see the announcement from the previously selected week  

## Feature 2: Join Household with Invite Code
Status: Implemented

### Scenario: Join a household with a valid invite code

**Given** I am a logged-in user who does not belong to a household  
**And** another household has a valid invite code  
**When** I enter the valid invite code and select Join household  
**Then** I become a member of that household  
**And** I can view that household’s chore board  

### Scenario: Enter an invalid invite code

**Given** I am a logged-in user who does not belong to a household  
**When** I enter an invite code that does not match any household  
**And** I select Join household  
**Then** I see an error message saying that the invite code is incorrect  
**And** I do not join a household which makes me sad  

## Feature 3: Chore Swapping
Status: Planned

### Scenario: Accept a chore swap request

**Given** I am a logged-in member of a household  
**And** I have been assigned a chore for the selected week  
**And** another household member requests to swap their chore with mine  
**When** I accept the chore swap request  
**Then** the two chore assignments are switched between both household members
**And** the chore board shows the updated assignments  

### Scenario: Decline a chore swap request

**Given** I am a logged-in member of a household  
**And** another household member requests to swap their chore with mine  
**When** I decline the chore swap request  
**Then** both chore assignments remain unchanged  
**And** the chore board continues to show the original assignments  

