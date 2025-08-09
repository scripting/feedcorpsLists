#### 10/19/23; 9:47:05 AM by DW

Handle structured outlines, respect comments, only push items of type "rss" with an xmlUrl attribute.

#### 10/18/23; 11:49:15 AM by DW

Side-effect of reading an outline is that it replaces the previous version in the cache. 

#### 10/17/23; 10:04:54 AM by DW

Started. We access the readinglists we publish through the domain links.feedcorps.org, so we can move the backend if we need to, which starts out on github. It also gives us a chance to filter the contents of the feeds, as they're being served. GIven that this is the beginning of a bootstrap, we want to avoid breakage as much as possible and this is an insurance policy against breakage. 

