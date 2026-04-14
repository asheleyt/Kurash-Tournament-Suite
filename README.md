# Kurash Scoring and Tournament Management System

## 1. System Overview

The project consists of two connected but independent components:

- **Scoreboard Web View** – Displays the current scores and timer.
- **Scoreboard Interface (Controls)** – Used by referees during live matches.
- **Public Tournament Website** – Displays schedules and history.
- **Player Registration** – Lets users input appropriate data needed.

Both systems share a centralized database while operating independently. This separation ensures stability during live matches while allowing public access to approved records.

## 2. Current Implementation Status

The project is currently in the **Single-Match Scoring** phase. The following features have been implemented and verified:

### Completed Features (Referee Controller & Scoreboard)

- **Real-time Scoring**: Referees can assign H, YO, and CH scores, which update instantly on the public scoreboard.
- **Undo Functionality**: Referees can undo the most recent scoring or penalty action.
- **Match Timer**: Full control (Start, Pause, Reset) with synchronized display.
- **Match Indicators**: Visual toggles for "Break", "Medic", and "Jazo" (Decision) modes.
- **Reset Confirmation**: Custom pop-up dialogs prevent accidental resets of the timer or the entire match.
- **Basic Player Info**: Referees can set player names, countries, and weights for the _current match_.

### Planned Features (In Progress)

- **Tournament Management**: Creating brackets (Round-Robin, Single-Elimination) is planned for Sprint 2.
- **Persistent Database**: Saving match history and player records to the database is planned for Sprint 3.
- **User Authentication**: Role-based access control is pending implementation.

## 3. Functional Requirements

### 3.1 Player Registration

- **FR-01**: The system shall allow administrators to register players with name, gender, weight division, team, and country.
- **FR-02**: The system shall allow administrators to edit or remove player information before tournament start.

### 3.2 Weight Category Logic

The system automatically determines the weight category for a match based on the gender and weights of the two players.

**Logic:**
1. The system identifies the gender of the match (Male or Female).
2. It compares the weights of both players.
3. The **heavier** valid weight between the two players is used to select the category. This ensures the match is categorized according to the highest weight class present.

**Weight Classes:**

- **Male**:
    - -60 kg
    - -66 kg
    - -73 kg
    - -81 kg
    - -90 kg
    - -100 kg
    - +100 kg

- **Female**:
    - -48 kg
    - -52 kg
    - -57 kg
    - -63 kg
    - -70 kg
    - -78 kg
    - -87 kg
    - +87 kg

### 3.3 Tournament and Bracket Management

- **FR-03**: The system shall allow administrators to select the preferred tournament bracket format before player assignment.
- **FR-04**: The system shall support configurable bracket formats including round-robin and single-elimination.
- **FR-05**: The system shall validate player count and notify administrators if the selected format is incompatible.
- **FR-06**: The system shall automatically update bracket progression as matches are completed.

### 3.3 Match Control

- **FR-07**: The system shall allow referees to start, pause, resume, and stop the match timer.
- **FR-08**: The system shall display break time, paramedic break, and match indicators.

### 3.4 Scoring System

- **FR-09**: The system shall allow referees to assign scores during a match.
- **FR-10**: The system shall support an undo function for the most recent action.
- **FR-11**: The system shall update scores in real time.
- **FR-12**: The system shall automatically determine match winners.

### 3.5 Match Records

- **FR-13**: The system shall store match results in a persistent database.
- **FR-14**: Authorized users shall be able to view historical records.
- **FR-15**: The system shall log scoring actions and undo operations.

### 3.6 User Access

- **FR-16**: The system shall require authentication for administrative access.
- **FR-17**: Unauthorized users shall not modify match data.

## 4. Non-Functional Requirements

### Performance

- Scores and timers’ updates on scoreboard real-time accordingly.
- Supports concurrent matches without lag.

### Usability

- Interface usable with minimal training.
- Supports keyboard and on-screen controls.

### Reliability

- Automatic match state saving.
- Recovery after unexpected shutdown.

### Security

- Role-based authentication.
- Data protection from unauthorized edits.

### Compatibility

- Runs on standard browsers.
- Works on laptops and tablets.

## 5. System Architecture

The Kurash Scoring System is a web-based application developed using PHP and MySQL. A centralized relational database stores player information, match records, and tournament brackets.

The scoreboard application writes live match data to the database, while the public website reads approved data for display. This architecture separates operational control from public presentation, improving system stability and security.

## 6. Scrum Methodology

The project follows Scrum to support incremental development and continuous feedback.

### Scrum Roles

- **Product Owner**: Oversees client communication and requirement validation.
- **Scrum Master**: Ensures Agile practices and removes blockers.
- **Development Team**: Implements, tests, and documents the system.

### Sprint Structure

Each sprint ends with a working demo presented to stakeholders for review.

## 7. Product Backlog (Prioritized)

The system includes a scoring board with undo functionality, a match timer with full controls, break and paramedic indicators, a player registration module, automated bracket generation, secure match-result storage, and user authentication for access control.

## 8. Sprint Plan

### Sprint 1 – Scoring Board Development (Completed)

- Live scoring prototype with undo and timer.
- Referee control interface with custom confirmation dialogs.

### Sprint 2 – Bracket Management (Pending)

- Dynamic bracket configuration and progression.

### Sprint 3 – Player Registration & Deployment (Pending)

- Final integration, testing, and release.

## 9. Expected Outcome

The final system will provide a stable and accurate scoring platform for Kurash tournaments. It will reduce human error, improve automation, improve match management efficiency, and maintain a transparent history of competition results accessible through a public website.
