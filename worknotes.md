#### 8/8/25; 10:39:11 AM by DW

Previous version got the lists from a <a href="https://github.com/scripting/a8c-FeedLand-Support/tree/main/lists">github repo</a>. 

I was planning on managing the lists in a community, but it didn't materialize. 

Now, a couple of years later, I am maintaining lists using FeedLand, so this should be the basis for FeedCorps.

The requests that the FeedLand client makes are the same as before. Nothing changed in FeedLand. 

And the metadata in the lists, title, description, etc are good now. Previously they were just the default stuff that FeedLand generates for OPML versions of subscription lists.

Now they are part of the config.json for this project. To add or edit the metadata for lists, you have to edit config.json.

Here are the URLs this responds to.

* https://lists.feedcorps.org/

* https://lists.feedcorps.org/?format=json

* https://lists.feedcorps.org/daveallfeeds.opml

* https://lists.feedcorps.org/daveblogroll.opml

* https://lists.feedcorps.org/davepodcasts.opml

#### 10/19/23; 9:47:05 AM by DW

Handle structured outlines, respect comments, only push items of type "rss" with an xmlUrl attribute.

#### 10/18/23; 11:49:15 AM by DW

Side-effect of reading an outline is that it replaces the previous version in the cache. 

#### 10/17/23; 10:04:54 AM by DW

Started. We access the readinglists we publish through the domain links.feedcorps.org, so we can move the backend if we need to, which starts out on github. It also gives us a chance to filter the contents of the feeds, as they're being served. GIven that this is the beginning of a bootstrap, we want to avoid breakage as much as possible and this is an insurance policy against breakage. 

