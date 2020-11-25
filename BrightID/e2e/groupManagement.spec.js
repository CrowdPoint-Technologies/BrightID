/* global device:false, element:false, by:false, waitFor:false */

import i18next from 'i18next';
import {
  createBrightID,
  createFakeConnection,
  expectConnectionsScreen,
  expectGroupsScreen,
  expectHomescreen,
  interConnect,
  inviteConnectionToGroup,
  joinAllGroups,
  navigateHome,
} from './testUtils';

const GroupName = 'Reservoir Dogs';

describe('Group Management', () => {
  let hasBackButton = true;
  let leaveGroupText = 'Leave group';
  const actionOK = i18next.t('common.alert.ok');

  beforeAll(async () => {
    const platform = await device.getPlatform();
    hasBackButton = platform === 'android';
    // create identity
    await createBrightID();

    // create 3 fake connections
    await createFakeConnection();
    await createFakeConnection();
    await createFakeConnection();

    // make sure all connections are established
    await element(by.id('connectionsBtn')).tap();
    await expectConnectionsScreen();
    await waitFor(element(by.id('connection-0')))
      .toExist()
      .withTimeout(20000);
    await waitFor(element(by.id('connection-1')))
      .toExist()
      .withTimeout(20000);
    await waitFor(element(by.id('connection-2')))
      .toExist()
      .withTimeout(20000);
    await navigateHome();

    // Connect all fake connections with each other
    await interConnect(0);
    await interConnect(1);
    await interConnect(2);
  });

  describe('Create group', () => {
    beforeAll(async () => {
      // navigate to group creation screen
      await element(by.id('groupsBtn')).tap();
      await expectGroupsScreen();
      await element(by.id('groupsCreateGroupBtn')).tap();
      await expect(element(by.id('groupInfoScreen'))).toBeVisible();
    });

    afterAll(async () => {
      await navigateHome();
    });

    it('should set group info', async () => {
      await element(by.id('editGroupName')).tap();
      await element(by.id('editGroupName')).typeText(GroupName);
      await element(by.id('editGroupName')).tapReturnKey();
      await expect(element(by.id('editGroupName'))).toHaveText(GroupName);
      await element(by.id('editGroupPhoto')).tap();
    });

    it('should set group Co-Founders', async () => {
      // proceed to next screen
      await expect(element(by.id('nextBtn'))).toBeVisible();
      await element(by.id('nextBtn')).tap();
      await expect(element(by.id('newGroupScreen'))).toBeVisible();
      // wait until 3 connections are there, sometimes they appear only after a few seconds
      await waitFor(element(by.id('checkCoFounderBtn')).atIndex(2))
        .toExist()
        .withTimeout(20000);
      // make the first 2 available connections co-founder
      await element(by.id('checkCoFounderBtn')).atIndex(0).tap();
      await element(by.id('checkCoFounderBtn')).atIndex(1).tap();
    });

    it('should create group', async () => {
      await element(by.id('createNewGroupBtn')).tap();
      await expect(element(by.id('createNewGroupBtn'))).toBeNotVisible();
      // if group was created successfully we should be back at the Groups screen
      await expectGroupsScreen();
      // there should be exactly one group now
      await expect(element(by.id('groupItem-0'))).toBeVisible();
      await expect(element(by.id('groupName'))).toHaveText(GroupName);
      await navigateHome();
    });

    it('invited co-founders should join group', async () => {
      // accept invitation
      await joinAllGroups(0);
      await joinAllGroups(1);

      // Check if cofounders actually joined the groups
      await expectHomescreen();
      // navigate to groups screen
      await element(by.id('groupsBtn')).tap();
      // wait 30 seconds until all join ops should be done on the backend
      await new Promise((r) => setTimeout(r, 30000));
      // refresh
      await element(by.id('groupsFlatList')).swipe('down');
      // Text changes to "Known members: " when all invited people have joined
      await waitFor(element(by.text(i18next.t('groups.label.knownMembers'))))
        .toBeVisible()
        .withTimeout(30000);
    });
  });

  describe('dismiss user from group', () => {
    const actionSheetTitle = i18next.t('common.actionSheet.title');
    const actionTitle = 'Dismiss from group';

    beforeAll(async () => {
      // invite
      await inviteConnectionToGroup(GroupName);
      // accept invitation
      await joinAllGroups(0);
      await joinAllGroups(1);
      await joinAllGroups(2);

      // check group members
      // navigate to groups screen
      await element(by.id('groupsBtn')).tap();
      await expectGroupsScreen();
      // wait 30 seconds until all join ops should be done on the backend
      await new Promise((r) => setTimeout(r, 30000));
      // refresh
      await element(by.id('groupsFlatList')).swipe('down');
      // Text changes to "Known members: " when all invited people have joined
      await waitFor(element(by.text(i18next.t('groups.label.knownMembers'))))
        .toBeVisible()
        .withTimeout(30000);
      // open group
      await element(by.text(GroupName)).tap();
      // Group should now have 4 members, so check for memberItem with index 3
      await expect(element(by.id('memberItem-3'))).toBeVisible();
      // Now on members screen. Go back to homescreen.
      // TODO: navigateHome just goes back one screen here, so execute 2 times :-/
      await element(by.id('header-back')).tap();
      await navigateHome();
    });

    it('should dismiss admin member from group', async () => {
      // navigate to groups screen
      await expectHomescreen();
      await element(by.id('groupsBtn')).tap();
      await expectGroupsScreen();
      // open group
      await element(by.text(GroupName)).tap();
      // Group should have 4 members, so check for memberItem with index 3
      await expect(element(by.id('memberItem-3'))).toBeVisible();

      // Open context menu of first member that is admin
      await element(by.id('memberContextBtn').withAncestor(by.id('admin')))
        .atIndex(0)
        .tap();

      // ActionSheet does not support testID, so match based on text.
      await waitFor(element(by.text(actionSheetTitle))).toBeVisible();
      await element(by.text(actionTitle)).tap();
      // dismiss confirmation screen
      await element(by.text(actionOK)).tap();
      // should be back on groups members screen, dismissed member should be removed
      // so the last index should be 2
      await expect(element(by.id('memberItem-3'))).not.toBeVisible();
      // Now on members screen. Go back to homescreen.
      // TODO: navigateHome just goes back one screen here, so execute 2 times :-/
      await element(by.id('header-back')).tap();
      await navigateHome();
    });

    it('should dismiss regular member from group', async () => {
      // navigate to groups screen
      await expectHomescreen();
      await element(by.id('groupsBtn')).tap();
      await expectGroupsScreen();
      // open group
      await element(by.text(GroupName)).tap();
      // Group should have 3 members, so check for memberItem with index 2
      await expect(element(by.id('memberItem-2'))).toBeVisible();

      // Open context menu of first regular user
      await element(by.id('memberContextBtn').withAncestor(by.id('regular')))
        .atIndex(0)
        .tap();

      // ActionSheet does not support testID, so match based on text.
      await waitFor(element(by.text(actionSheetTitle))).toBeVisible();
      await element(by.text(actionTitle)).tap();
      // dismiss confirmation screen
      await element(by.text(actionOK)).tap();
      // should be back on groups members screen, dismissed member should be removed
      // so the last index should be 1
      await expect(element(by.id('memberItem-2'))).not.toBeVisible();
      // Now on members screen. Go back to homescreen.
      // TODO: navigateHome just goes back one screen here, so execute 2 times :-/
      await element(by.id('header-back')).tap();
      await navigateHome();
    });
  });

  describe('Promote regular member to admin', () => {
    beforeAll(async () => {
      // invite
      await inviteConnectionToGroup(GroupName);
      // accept invitation
      await joinAllGroups(0);
      await joinAllGroups(1);
      await joinAllGroups(2);

      // check group members
      // navigate to groups screen
      await element(by.id('groupsBtn')).tap();
      await expectGroupsScreen();
      // wait 30 seconds until all join ops should be done on the backend
      await new Promise((r) => setTimeout(r, 30000));
      // refresh
      await element(by.id('groupsFlatList')).swipe('down');
      // Text changes to "Known members: " when all invited people have joined
      await waitFor(element(by.text(i18next.t('groups.label.knownMembers'))))
        .toBeVisible()
        .withTimeout(30000);
      // open group
      await element(by.text(GroupName)).tap();
      // Group should now have 3 members, so check for memberItem with index 2
      await expect(element(by.id('memberItem-2'))).toBeVisible();
      // Now on members screen. Go back to homescreen.
      // TODO: navigateHome just goes back one screen here, so execute 2 times :-/
      await element(by.id('header-back')).tap();
      await navigateHome();
    });

    it('should promote member of group to admin', async () => {
      const actionSheetTitle = 'What do you want to do?';
      const actionTitle = 'Add Admin';

      // navigate to groups screen
      await element(by.id('groupsBtn')).tap();
      await expectGroupsScreen();
      // open group
      await element(by.text(GroupName)).tap();

      // Open context menu of first member that is not admin
      await element(by.id('memberContextBtn').withAncestor(by.id('regular')))
        .atIndex(0)
        .tap();

      // ActionSheet does not support testID, so match based on text.
      await waitFor(element(by.text(actionSheetTitle))).toBeVisible();
      await element(by.text(actionTitle)).tap();
      // dismiss confirmation screen
      await element(by.text(actionOK)).tap();
      // All members should be admin now
      await expect(
        element(by.id('memberContextBtn').withAncestor(by.id('regular'))),
      ).not.toExist();
    });
  });

  describe('Leave group', () => {
    // Skipping, as this test hangs forever after clicking OK :-(
    xit('should leave group', async () => {
      await expectHomescreen();
      // navigate to groups screen
      await element(by.id('groupsBtn')).tap();
      await expectGroupsScreen();
      // select first group
      await element(by.id('groupItem-0')).tap();
      await expect(element(by.id('groupOptionsBtn'))).toBeVisible();
      await element(by.id('groupOptionsBtn')).tap();
      await expect(element(by.text(leaveGroupText))).toBeVisible();
      await element(by.text(leaveGroupText)).tap();
      // confirm with OK button
      await expect(element(by.text(actionOK))).toBeVisible();

      // following tap action fails in detox with error
      // "Test Failed: Error performing 'com.wix.detox.espresso.action.detoxsingletap@c26e546 click - At Coordinates: 1192, 1573 and precision: 16, 16' on view '(with text: is "OK" and view has effective visibility=VISIBLE)'."
      await element(by.text(actionOK)).tap();

      // should be back at groups screen
      await expectGroupsScreen();
      // go back to home screen
      await navigateHome();
      await expectHomescreen();
    });
  });
});
