# Instagram Export Data Viewer

I have created this tool to easily navigate the files provided by Instagram's export account information. 

The current HTML format provided by Instagram/Meta lacks many useful features and does not provide all the data available when exporting with JSON. This tool aims to provide a clean, organized UI for browsing and viewing all of the data included in the JSON export.

This tool will only remain as local. There is no planned online tool as it requires sensitive account information from users.

This tool is designed to run entirely locally. There are no plans to provide an online version, as the data in Instagram exports includes sensitive personal and account information.

## Setup

Requires NodeJS

1. Clone the repository  
`git clone https://github.com/Arkadyaaa/InstagramExportDataViewer.git_`

2. Install required dependencies  
`npm install`

4. Extract your instagram data on the project folder  
`.../InstagramExportDataViewer/data`

5. Start the application  
`npm start`

6. Open the localhost url shown in the terminal  
`http://localhost:3000`

## Features

_This project is still work in progress. Most of the planned features are not yet implemented._

### Connections
 - Shows the list of followers and followings. 
 - Includes blocked profiles, follow requests, close friends, recently unfollowed, etc.
 - Shows the date of when the user followed / unfollowed. In the section of blocked profiles, close friends, etc, it shows when they were blocked or added to close friends.

### Messages
 - Shows all of the exported messages. Displayed similarly to how Instagram displays chat in the web browser.
 - Currently supports viewing of text, images, gifs, videos, and audio messages.
 - Has a search bar for searching all conversations.
 - Has a media tab to show all images and videos in the current conversation, similar to Instagram app/web.
 - Button to copy the chat ID, used for finding the chat folder in `/data/your_instagram_activity\messages\`.

Limitations and planned features for messages:

 - Instagram does not provide an identifier for chat recipients; it only shows the display name of the users. Because of this limitation, it is not possible to locate the user's Instagram profile link or display their profile picture.
    
    I have attempted to implement a feature that finds their Instagram username by searching their display name in the account's follower/following list. However, this is unreliable, especially for different accounts with the same display name or for accounts that have changed their display name.

 - The JSON export does not differentiate Instagram and Threads messages. Both are displayed in the tool, but it cannot display which platform it's from.

 - Currently does not display messages related to stories. The JSON files includes a link to the story related to the message, but it always points to an unavailable story. The exported data does contain all available story archives, however I have not found a way to reference the exact story related to the chat. 
 
 - Currently does not display attached links and external gifs. Will be implemented.
   
 - Planned to implement more options for searching. Currently only supports searching messages through all conversations (Users can use CTRL+F for searching individual conversations). I have plans to implement searching messages sent on a specific date or a date range and searching a specific display name for all the conversations they are part of(for group chats).

### Personal Information
 - Currently only supports profile changes. This tab displays the change history of profile name, username, profile bio, and profile links.
