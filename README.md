Step 1: Extract

NM sales data https://crop.rld.nm.gov/data-catalog.html allows downloading .xlsx files by moth

I could just manually download all files -- but that's not entirely efficient for routine analysis.

Investigating the source page on the website, uncovered an AWS API Gateway endpoint with a blank authTokenGUID which led me to believe this was a public API

The root folder contains year subfolders (2022–2026), each with its own folderId
To get the actual .xlsx files, we just need to query each year folder by swapping folderId in the URL

See nm_cannabis_downloader.py

Step 2: Transform

Once downloaded I checked the column names and whether they've changed year over year

Step 3: Load
