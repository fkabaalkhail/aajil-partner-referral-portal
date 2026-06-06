# Requirements Document

## Introduction

The Partner Referral Portal formalizes Aajil's supplier-to-client referral process. Suppliers (invite-only) receive unique referral codes they share with prospective clients. Clients register through referral links, and the system attributes each registration to the referring supplier. Aajil Growth Ops can manage supplier lifecycles and view referral analytics through an admin dashboard.

## Glossary

- **Portal**: The Partner Referral Portal web application
- **Admin**: An Aajil Growth Ops team member who manages suppliers and views referral data (e.g., Lina)
- **Supplier**: An invited partner who refers clients to Aajil using a unique referral code (e.g., Khaled, Mona)
- **Client**: A prospective customer who registers via a supplier's referral link (e.g., Yasser)
- **Referral_Code**: A unique, human-readable alphanumeric identifier assigned to each supplier for sharing
- **Referral_Link**: A URL containing the Referral_Code that directs a Client to the registration page
- **Invitation**: A record created by an Admin to onboard a new Supplier into the Portal
- **Attribution**: The association between a registered Client and the Supplier whose Referral_Link the Client used
- **Supplier_Status**: The current state of a Supplier account, either "active" or "deactivated"

## Requirements

### Requirement 1: Invite Supplier

**User Story:** As Lina (Admin), I want to invite a new supplier by providing their basic details, so they can start referring clients.

#### Acceptance Criteria

1. WHEN an Admin submits a supplier invitation with a name (1 to 100 characters) and a valid contact email, THE Portal SHALL create a new Supplier record with Supplier_Status set to "active"
2. WHEN a Supplier record is created, THE Portal SHALL generate a unique Referral_Code consisting of 8 alphanumeric characters and associate it with the Supplier record
3. WHEN a Supplier record is created, THE Portal SHALL log the supplier name, contact email, and generated Referral_Code to the console (simulating email/SMS notification)
4. IF a supplier invitation is submitted with an email that already exists in the system, THEN THE Portal SHALL reject the invitation and display an error indicating the email is already registered
5. IF a supplier invitation is submitted with a missing name, a name exceeding 100 characters, or an invalid email format, THEN THE Portal SHALL reject the invitation and display an error indicating which field is invalid

### Requirement 2: Generate Referral Link

**User Story:** As Khaled (Supplier), I want a referral link I can copy and paste into WhatsApp, so I can easily share it with contractors.

#### Acceptance Criteria

1. WHEN a Supplier views their dashboard, THE Portal SHALL display the Supplier's Referral_Link as a full absolute URL within a read-only text field accompanied by a copy action button
2. WHEN a Supplier clicks the copy action on the Referral_Link, THE Portal SHALL copy the full Referral_Link URL to the clipboard and display a visual confirmation indicating the link was copied successfully for at least 3 seconds
3. THE Referral_Link SHALL contain the Supplier's Referral_Code as a URL query parameter and SHALL be a valid absolute URL that renders as a clickable link when pasted into messaging applications
4. IF the clipboard copy action fails, THEN THE Portal SHALL display a message indicating the copy failed and SHALL keep the Referral_Link visible in the read-only text field so the Supplier can manually select and copy it

### Requirement 3: Verify Referral Link

**User Story:** As Mona (Supplier), I want to confirm my referral link is live before I share it, so I have confidence it works.

#### Acceptance Criteria

1. WHEN a Supplier navigates to their own Referral_Link, THE Portal SHALL display the client registration page within 3 seconds, showing the Supplier's full name in a visible referrer label on the page
2. WHEN a Supplier views their dashboard, THE Portal SHALL display a text-based status label adjacent to the Referral_Link indicating either "Active" or "Inactive"
3. IF a Supplier navigates to a Referral_Link that is inactive or invalid, THEN THE Portal SHALL display an error message indicating the link is not available and SHALL not display the client registration page
4. WHEN a Supplier navigates to their own Referral_Link, THE Portal SHALL not count the visit as a referral

### Requirement 4: Client Registration via Referral

**User Story:** As Yasser (Client), I want to register quickly using the referral link I received, so I can get started without friction.

#### Acceptance Criteria

1. WHEN a Client opens a valid Referral_Link, THE Portal SHALL display a registration form requesting business name, contact name, phone number, and email
2. WHEN a Client submits a completed registration form via a Referral_Link, THE Portal SHALL create a Client record with an Attribution to the Supplier who owns the Referral_Code and display a confirmation message indicating successful registration
3. IF a Client opens a Referral_Link with an invalid or expired Referral_Code, THEN THE Portal SHALL display an error message indicating the link is not valid
4. IF a Client submits a registration form with any of the four required fields (business name, contact name, phone number, email) empty, THEN THE Portal SHALL display validation errors identifying the missing fields and preserve the data already entered
5. IF a Client submits a registration with an email that already exists, THEN THE Portal SHALL reject the registration and inform the Client the email is already in use
6. IF a Client submits a registration form with a phone number that does not match E.164 format or an email that does not contain a valid email structure, THEN THE Portal SHALL display a validation error identifying the invalid field and preserve the data already entered

### Requirement 5: Supplier Referral Tracking

**User Story:** As Khaled (Supplier), I want to see how many of my referrals actually registered, so I know my efforts are paying off.

#### Acceptance Criteria

1. WHEN a Supplier views their dashboard, THE Portal SHALL display the total count of referred Clients who have completed registration attributed to that Supplier
2. WHEN a Supplier views their dashboard, THE Portal SHALL display a list of referred Clients who have completed registration, showing business name and registration date, sorted by registration date descending (most recent first), displaying at most 20 entries per page
3. IF a Supplier has no referred Clients who have completed registration, THEN THE Portal SHALL display a count of zero and an empty list with a message indicating no referrals have registered yet

### Requirement 6: Admin Referral Analytics

**User Story:** As Lina (Admin), I want to see which suppliers are bringing in the most clients, so I know where to invest relationship efforts.

#### Acceptance Criteria

1. WHEN an Admin views the admin dashboard, THE Portal SHALL display a list of all Suppliers showing supplier name and the total number of referrals attributed to each Supplier
2. WHEN an Admin views the admin dashboard, THE Portal SHALL sort Suppliers by referral count in descending order by default
3. WHEN an Admin selects a Supplier from the list, THE Portal SHALL display the list of Clients attributed to that Supplier showing business name, contact name, and registration date, sorted by registration date in descending order
4. IF no Suppliers have referrals, THEN THE Portal SHALL display an empty-state message indicating that no referral data is available yet
5. IF an Admin selects a Supplier that has no Clients attributed, THEN THE Portal SHALL display an empty-state message indicating that no clients have been referred by that Supplier

### Requirement 7: Deactivate Supplier

**User Story:** As Lina (Admin), I want to deactivate a supplier without losing the historical record of who they referred, so I maintain data integrity.

#### Acceptance Criteria

1. WHEN an Admin deactivates a Supplier, THE Portal SHALL set the Supplier_Status to "deactivated" and display a confirmation message indicating the Supplier has been deactivated
2. WHILE a Supplier's Supplier_Status is "deactivated", THE Portal SHALL reject any Client registration attempts using that Supplier's Referral_Link and display a message indicating the referral link is no longer active
3. WHILE a Supplier's Supplier_Status is "deactivated", THE Portal SHALL retain all existing Attribution records for the Supplier
4. WHEN an Admin views the admin dashboard, THE Portal SHALL display a "deactivated" status label on deactivated Suppliers and render their row in a muted or greyed-out style distinct from active Suppliers
5. WHEN an Admin reactivates a deactivated Supplier, THE Portal SHALL set the Supplier_Status to "active" and restore the Supplier's original Referral_Link to accept new Client registrations
6. IF an Admin attempts to deactivate a Supplier whose Supplier_Status is already "deactivated", THEN THE Portal SHALL display a message indicating the Supplier is already deactivated and take no further action

### Requirement 8: Authentication and Access Control

**User Story:** As a user of the Portal, I want secure access appropriate to my role, so that only authorized users can perform actions.

#### Acceptance Criteria

1. WHEN a user attempts to access a protected resource, THE Portal SHALL validate the user's session cookie or JWT before granting access to the resource
2. WHILE a user is authenticated as an Admin, THE Portal SHALL grant access to supplier management and referral analytics features
3. WHILE a user is authenticated as a Supplier, THE Portal SHALL grant access only to the Supplier's own dashboard and referral data
4. IF an unauthenticated user attempts to access a protected resource, THEN THE Portal SHALL redirect the user to the login page
5. THE Portal SHALL prevent a Supplier from viewing another Supplier's referral data
6. IF an authenticated user attempts to access a resource not permitted by their role, THEN THE Portal SHALL deny access and display a message indicating insufficient permissions
7. IF a user's session or JWT has expired, THEN THE Portal SHALL treat the user as unauthenticated and redirect to the login page within 1 second of the next request

### Requirement 9: Seed Data

**User Story:** As a developer evaluating the system, I want pre-loaded seed data so I can immediately explore the portal's functionality.

#### Acceptance Criteria

1. WHEN the system starts for the first time, THE Portal SHALL seed the database with one Admin user (persona: Lina) with documented login credentials (email and password) printed to the console or included in a README
2. WHEN the system starts for the first time, THE Portal SHALL seed the database with at least two Supplier records: one established Supplier (persona: Khaled) with at least one attributed Client and an active Referral_Code, and one new Supplier (persona: Mona) with an active Referral_Code but zero attributed Clients
3. WHEN the system starts for the first time, THE Portal SHALL seed the database with at least one Client record (persona: Yasser) attributed to the established Supplier (Khaled) via a Referral_Code
4. THE Portal SHALL provide a single-command startup via docker-compose up that provisions all seed data automatically and reaches a usable state within 5 minutes on a fresh machine
5. IF the system starts and seed data already exists in the database, THEN THE Portal SHALL skip seeding and preserve existing data without duplication
6. THE Portal SHALL document all seeded user credentials (email and password for each persona) so that an evaluator can log in as Admin, established Supplier, new Supplier, or Client without additional configuration
