export enum UserVerifyStatus {
  Unverified,
  Verified,
  Banned
}

export enum TokenType {
  AccessToken,
  RefreshToken,
  ForgotPasswordToken,
  EmailVerifyToken
}

export enum MediaType {
  Image,
  Video,
  HLS
}
export enum MediaTypeQuery {
  Image = 'image',
  Video = 'video'
}
export enum EncodingStatus {
  Pending, //hàng đợi
  Processing, //Đang encode
  Success, // Encode thành công
  Failed // Encode thất bại
}

export enum TweetType {
  Tweet,
  Retweet,
  Comment,
  QuoteTweet
}
export enum TweetAudience {
  Everyone,
  TwitterCircle
}

export enum AccountStatus {
  FREE = 0,
  PREMIUM = 1,
  PLATINUM = 2
}

export enum ActionType {
  FRIEND_REQUEST = 'FRIEND_REQUEST',
  FRIEND_REQUEST_ACCEPTED = 'FRIEND_REQUEST_ACCEPTED',
  FRIEND_REQUEST_REJECTED = 'FRIEND_REQUEST_REJECTED',
  FOLLOW = 'FOLLOW',
  UNFOLLOW = 'UNFOLLOW',
  LIKE = 'LIKE',
  UNLIKE = 'UNLIKE',
  COMMENT = 'COMMENT',
  REPLY = 'REPLY',
  RETWEET = 'RETWEET',
  TWEET = 'TWEET',
  QUOTE = 'QUOTE',
  MENTION = 'MENTION',
  TAG = 'TAG',
  SHARE = 'SHARE',
  REPORT = 'REPORT',
  BLOCK = 'BLOCK',
  UNBLOCK = 'UNBLOCK',
  MUTE = 'MUTE',
  UNMUTE = 'UNMUTE',
  STORY = 'STORY',
  STORY_REPLY = 'STORY_REPLY',
  BOOKMARK = 'BOOKMARK',
  UNBOOKMARK = 'UNBOOKMARK'
}

export enum NotificationStatus {
  Unread,
  Read
}

export enum FeedbackStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Resolved = 'resolved',
  Closed = 'closed'
}

export enum FeedbackPriority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Urgent = 'urgent'
}

export enum FeedbackCategory {
  TechnicalIssue = 'technical_issue',
  FeatureRequest = 'feature_request',
  UserInterface = 'user_interface',
  Performance = 'performance',
  ContentSuggestion = 'content_suggestion',
  SystemBug = 'system_bug',
  Other = 'other'
}
