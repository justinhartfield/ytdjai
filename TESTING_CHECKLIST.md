# End-to-End Testing Checklist
## Cloud Storage & Browse Features

### Pre-Test Setup
- [ ] Verify Netlify environment variables are set (see NETLIFY_SETUP.md)
- [ ] Verify Supabase database schema is created (see SUPABASE_SETUP.md)
- [ ] Visit https://ytdj.ai
- [ ] Open browser DevTools Console (F12) to monitor for errors

---

## Test 1: Authentication
- [ ] Click on user avatar/sign in button
- [ ] Sign in with Google OAuth
- [ ] Verify successful authentication (user email appears in header)
- [ ] **Expected**: No console errors, successful OAuth redirect

---

## Test 2: Create a DJ Set
- [ ] Click "New Set" button in header
- [ ] Generate a playlist using AI (enter a prompt and click generate)
- [ ] Verify tracks appear in the arrangement view
- [ ] **Expected**: Set has tracks, "Save" button becomes enabled

---

## Test 3: Save Set to Cloud
- [ ] Click "Save" button in header
- [ ] Verify SaveSetDialog modal opens
- [ ] Check that set info is displayed (track count, arc template)
- [ ] Enter a name for the set (e.g., "Test Set 1")
- [ ] Click "Save to Cloud" button
- [ ] **Expected**:
  - Loading spinner appears
  - Success message: "Set saved successfully!"
  - Modal closes automatically after ~1.5 seconds
  - No console errors

**Check Database:**
- [ ] Go to Supabase Dashboard → Table Editor → dj_sets
- [ ] Verify new row exists with:
  - Your email in `user_email`
  - Set name in `name` field
  - Track data in `data` JSONB field
  - Timestamps in `created_at` and `updated_at`

---

## Test 4: Browse Saved Sets
- [ ] Click the folder icon or current set name in header
- [ ] Verify BrowseSetsModal opens
- [ ] **Expected**:
  - Your saved set appears in the list
  - Shows correct track count
  - Shows last updated time (e.g., "Just now" or "2m ago")
  - Shows arc template (if applicable)
  - No "No saved sets yet" message

---

## Test 5: Load Set from Cloud
- [ ] In the Browse modal, click "Load" on your saved set
- [ ] **Expected**:
  - Loading spinner on the Load button
  - Modal closes
  - Set loads into the main view
  - All tracks appear correctly
  - Set name appears in header

---

## Test 6: Save Multiple Sets
- [ ] Click "New Set" to create a fresh set
- [ ] Generate a different playlist
- [ ] Save with a different name (e.g., "Test Set 2")
- [ ] Open Browse modal
- [ ] **Expected**:
  - Both sets appear in the list
  - Most recently saved appears first
  - Each shows correct metadata

---

## Test 7: Update Existing Set
- [ ] Load one of your saved sets
- [ ] Make changes (add/remove tracks, change order)
- [ ] Click "Save" again
- [ ] Keep the same name
- [ ] Click "Save to Cloud"
- [ ] **Expected**:
  - Success message appears
  - `updated_at` timestamp changes in database
  - No duplicate entry created

**Verify in Supabase:**
- [ ] Check that only one row exists for this set_id
- [ ] `updated_at` is newer than `created_at`

---

## Test 8: Delete Set from Cloud
- [ ] Open Browse modal
- [ ] Click trash icon next to a set
- [ ] Confirm deletion in the browser alert
- [ ] **Expected**:
  - Deleting spinner appears
  - Set disappears from list
  - No console errors
  - Set removed from Supabase database

---

## Test 9: Cross-Device Sync
- [ ] Open ytdj.ai in a different browser or incognito window
- [ ] Sign in with the same Google account
- [ ] Open Browse modal
- [ ] **Expected**: All your saved sets appear (proving cloud sync works)

---

## Test 10: Export Integration
- [ ] Load a saved set
- [ ] Export it to YouTube
- [ ] After export succeeds, save the set again
- [ ] Open Browse modal
- [ ] **Expected**:
  - Set shows "Exported" badge with YouTube icon
  - `isExported` is true in database

---

## Test 11: Error Handling

### Test Unauthorized Access
- [ ] Sign out
- [ ] Try to access Browse modal
- [ ] **Expected**: Prompts to sign in (or shows empty state)

### Test Network Failure
- [ ] Open DevTools → Network tab
- [ ] Set throttling to "Offline"
- [ ] Try to save a set
- [ ] **Expected**: Error message: "Network error"
- [ ] Re-enable network
- [ ] Try again - should work

### Test Invalid Data
- [ ] Try to save an empty set (no tracks)
- [ ] **Expected**: Save button is disabled

---

## Test 12: UI/UX Polish

### Save Dialog
- [ ] Verify modal has proper styling
- [ ] Test keyboard: ESC closes modal
- [ ] Test clicking outside modal closes it
- [ ] Verify buttons are disabled during save operation

### Browse Modal
- [ ] Verify responsive layout (resize window)
- [ ] Test scrolling if many sets exist
- [ ] Verify date formatting (just now, 5m ago, 2h ago, 3d ago)
- [ ] Verify "Refresh" button works
- [ ] Test closing with ESC, clicking outside, or Close button

---

## Common Issues & Solutions

### ❌ "Unauthorized" error
**Solution**: Make sure you're signed in with Google OAuth

### ❌ "Failed to save set" error
**Possible causes:**
- Supabase service role key not set in Netlify
- Database migration not run
- Invalid session token

**Debug**: Check Netlify logs and browser console

### ❌ Sets not appearing in Browse modal
**Possible causes:**
- Wrong email in database (check Supabase)
- API endpoint returning empty array
- Filtering by wrong user

**Debug**: Check Network tab in DevTools for API response

### ❌ "supabaseUrl is required" error
**Solution**:
- Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Netlify
- Redeploy site

---

## Performance Tests

- [ ] Save a large set (20+ tracks) - should complete in < 2 seconds
- [ ] Browse modal with 10+ sets - should load in < 1 second
- [ ] Load a set from cloud - should complete in < 1 second
- [ ] Delete operation - should complete instantly

---

## Browser Compatibility

Test on:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (Mac/iOS)
- [ ] Mobile browsers (iOS Safari, Chrome Android)

---

## Final Checklist

- [ ] All core features work (save, load, browse, delete)
- [ ] No console errors during normal operation
- [ ] Data persists correctly in Supabase
- [ ] Cross-device sync works
- [ ] Error states are handled gracefully
- [ ] UI is responsive and polished
- [ ] Performance is acceptable

---

## Issues Found

Document any issues here:

| Issue | Severity | Steps to Reproduce | Expected | Actual |
|-------|----------|-------------------|----------|--------|
| | | | | |

