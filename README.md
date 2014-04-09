js-audioplayer
==============
by Alexander Junger

A small Audioplayer that supports JSON playlists and standard MP3-files. It supports basic playlist functionality like ordering tracks, deleting/adding tracks and shuffling/repeating tracks, aside from standard audio controls. 
The player also fully integrates with localStorage, which means that it will resume in exactly the same state after reloading. This theoretically works for directly imported MP3 files, however since they are stored as data-URLs in localStorage, most browsers reject them due to exceeding allowed storage capacities for localStorage. Using FileSystem API would be preferrable and I might implement this in the future.

This player evolved out of a task for university that I enjoyed quite a bit and put some effort into. This is only a player and I am not responsible for any potential copyright infringement that it's users may cause.
