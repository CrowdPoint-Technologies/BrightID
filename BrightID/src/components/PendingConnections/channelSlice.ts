import {
  createSelector,
  createSlice,
  createEntityAdapter,
  PayloadAction,
  Update,
} from '@reduxjs/toolkit';

import { Draft } from 'immer';
/*

  What is a channel:
  - 'aesKey': encryption key for data transported through channel
  - 'api': instance of ChannelAPI for this channel
  - 'id': unique identifier
  - 'initiatorProfileId': profileId of channel initiator
  - 'myProfileId': my profileId in this channel
  - 'pollTimerId: IntervalId of timer polling for incoming connection requests from this channel
  - 'state': state of channel - see channel_states below
  - 'timestamp': timestamp of channel creation time
  - 'ttl': time to live of channel (seconds)
  - 'type': group or 1:1 connection - see channel_types below
  - 'timeoutId: Id of timer to expire channel once ttl is reached
  - 'url': url of channel

  The app could hold multiple channels at the same time. E.g. if i scan multiple QRCodes
  in a larger group session.

 */

export enum channel_types {
  GROUP = 'GROUP',
  SINGLE = 'SINGLE',
  STAR = 'STAR',
}

export enum channel_states {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  BACKGROUND = 'BACKGROUND',
}

export const channelsAdapter = createEntityAdapter<Channel>();

const initialState = channelsAdapter.getInitialState<DisplayChannel>({
  displayChannelType: channel_types.SINGLE,
  myChannelIds: {
    [channel_types.SINGLE]: '',
    [channel_types.GROUP]: '',
    [channel_types.STAR]: '',
  },
});

const channelSlice = createSlice({
  name: 'channels',
  initialState,
  reducers: {
    addChannel(state: Draft<ChannelsState>, action: PayloadAction<Channel>) {
      state = channelsAdapter.addOne<ChannelsState>(
        state as ChannelsState,
        action,
      );
    },
    // addChannel: channelsAdapter.addOne,
    updateChannel(
      state: Draft<ChannelsState>,
      action: PayloadAction<Update<Channel>>,
    ) {
      state = channelsAdapter.updateOne<ChannelsState>(
        state as ChannelsState,
        action,
      );
    },
    closeChannel(
      state: Draft<ChannelsState>,
      action: PayloadAction<{ channelId: string; background: boolean }>,
    ) {
      const { channelId, background } = action.payload;
      state = channelsAdapter.updateOne<ChannelsState>(state as ChannelsState, {
        id: channelId,
        changes: {
          state: background ? channel_states.BACKGROUND : channel_states.CLOSED,
        },
      });
      if (state.myChannelIds[channel_types.SINGLE] === channelId)
        state.myChannelIds[channel_types.SINGLE] = '';

      if (state.myChannelIds[channel_types.GROUP] === channelId)
        state.myChannelIds[channel_types.GROUP] = '';

      if (state.myChannelIds[channel_types.STAR] === channelId)
        state.myChannelIds[channel_types.STAR] = '';
    },
    removeChannel(state: Draft<ChannelsState>, action: PayloadAction<string>) {
      const channelId = action.payload;
      state = channelsAdapter.removeOne<ChannelsState>(
        state as ChannelsState,
        channelId,
      );
      // In case my channel got removed also clear myChannelId
      if (state.myChannelIds[channel_types.SINGLE] === channelId)
        state.myChannelIds[channel_types.SINGLE] === '';

      if (state.myChannelIds[channel_types.GROUP] === channelId)
        state.myChannelIds[channel_types.GROUP] === '';

      if (state.myChannelIds[channel_types.STAR] === channelId)
        state.myChannelIds[channel_types.STAR] = '';
    },
    setMyChannel(
      state: Draft<ChannelsState>,
      action: PayloadAction<{ channelType: ChannelType; channelId: string }>,
    ) {
      const { channelType, channelId } = action.payload;
      state.myChannelIds[channelType] = channelId;
    },
    setDisplayChannelType(
      state: Draft<ChannelsState>,
      action: PayloadAction<ChannelType>,
    ) {
      const channelType = action.payload;
      state.displayChannelType = channelType;
    },
  },
});

// Export channel actions
export const {
  addChannel,
  updateChannel,
  removeChannel,
  setMyChannel,
  closeChannel,
  setDisplayChannelType,
} = channelSlice.actions;

// Export channel selectors
export const {
  selectById: selectChannelById,
  selectAll: selectAllChannels,
  selectIds: selectAllChannelIds,
} = channelsAdapter.getSelectors((state: State) => state.channels);

// additional selectors
export const selectAllActiveChannelIds = createSelector(
  selectAllChannels,
  // check to see if this is state or channel state
  (_: State, type: ChannelType) => type,
  (channels, type) =>
    channels.filter((pc) => pc.type === type).map((pc) => pc.id),
);

export const selectAllActiveChannelIdsByType = createSelector(
  selectAllChannels,
  (_: State, type: ChannelType) => type,
  (channels, type) =>
    channels
      .filter(
        (pc) =>
          pc.type === type &&
          (pc.state === channel_states.OPEN ||
            pc.state === channel_states.BACKGROUND),
      )
      .map((pc) => pc.id),
);

// Export reducer
export default channelSlice.reducer;
