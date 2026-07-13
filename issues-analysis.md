# Issues Analysis – TechBridge Library Management System

## Introduction

The starter code contained several problems related to JavaScript syntax, object-oriented programming, DOM manipulation, recursion, error handling, and data storage. These issues caused runtime errors, incorrect program behaviour, and made the application difficult to maintain.

To improve the project, the code was refactored into separate modules (`library.js`, `ui.js`, `storage.js`, and `utils.js`). This made the application easier to understand, test, and maintain.

---

## Critical Issues Fixed

### 1. Global Variables

The starter code created global variables by assigning values without using `const` or `let`.

Example:

```javascript
books = [];
MAX_BOOKS_PER_MEMBER = 5;
```

This pollutes the global scope and can lead to unexpected behaviour.

**Solution**

All variables are now declared using `const` or `let` to keep them properly scoped.

---

### 2. Incorrect Comparison Operators

Several conditions used the assignment operator (`=`) instead of the comparison operator (`===`).

Example:

```javascript
if (member.id = id)
```

This assigns a value instead of comparing it.

**Solution**

All comparisons now use strict equality (`===`) to avoid unintended assignments.

---

### 3. Missing Input Validation

The starter code accepted invalid values such as empty strings and negative copy numbers.

**Solution**

Validation was added to constructors and methods to ensure only valid data is accepted before creating objects or performing operations.

---

### 4. Borrowing Books Without Availability Checks

Books could be borrowed even when there were no copies available.

**Solution**

The `checkOut()` method now checks whether copies are available before allowing a book to be borrowed.

---

### 5. Missing Error Handling

Functions such as importing JSON data could crash the application if invalid data was provided.

**Solution**

`try...catch` blocks were added to safely handle errors and return meaningful messages instead of stopping the application.

---

### 6. Recursive Functions

The recursive functions had no proper stopping condition.

**Solution**

Base cases were added so recursion stops correctly and prevents stack overflow errors.

---

### 7. DOM Initialisation

The application attempted to access HTML elements before they had loaded.

**Solution**

The application now starts only after the `DOMContentLoaded` event has fired.

---

### 8. Incorrect Event Listeners

Some elements listened for the wrong events.

For example, the category dropdown used `click` instead of `change`.

**Solution**

Each control now uses the correct event type.

---

### 9. Form Submission

Submitting forms refreshed the page, causing all data to be lost.

**Solution**

Each form handler now calls:

```javascript
event.preventDefault();
```

before processing the form.

---

### 10. Local Storage

Objects were stored directly in Local Storage without converting them into JSON.

**Solution**

The application now uses:

- `JSON.stringify()` when saving data.
- `JSON.parse()` when loading data.

Additional error handling was added to deal with invalid or missing data.

---

## JavaScript Improvements

The project now makes use of several modern JavaScript features.

- Replaced `var` with `const` and `let`.
- Used template literals instead of string concatenation.
- Used array methods such as `filter()`, `map()`, `find()`, `some()`, `every()`, and `reduce()`.
- Used object destructuring where appropriate.
- Used spread and rest operators.
- Implemented classes and inheritance.
- Added recursive helper functions.
- Added input validation and proper error handling.

---

## User Interface Improvements

Several improvements were made to the user interface.

- Dynamic rendering of books and members.
- Search functionality.
- Category filtering.
- Event delegation for dynamically created buttons.
- Statistics panel.
- Export library data as JSON.
- Save and load data using Local Storage.

---

## Testing

The application was tested using Jest.

The tests cover:

- Book functionality.
- Member functionality.
- Library operations.
- Recursive helper functions.
- Import and export features.
- Local Storage functions.
- User interface rendering.
- Event handling.

All tests pass successfully.

---

## Conclusion

The starter code contained numerous issues involving variables, operators, recursion, object-oriented programming, DOM manipulation, and data storage.

After refactoring the application, the code is more reliable, easier to maintain, and follows modern JavaScript practices. The completed application meets the project requirements and provides a working library management system.
