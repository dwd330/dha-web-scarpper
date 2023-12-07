const puppeteer = require('puppeteer');
const ExcelJS = require('exceljs');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  const url = 'https://www.dha.gov.ae/en/medical-listing/facilities';
  var outdata=[];
  await page.goto(url);

  // Click the search button
  const inputSelector = 'input[name="DHAserach"]';
  await page.waitForSelector(inputSelector);
  await page.type(inputSelector, '');
  await page.keyboard.press('Enter');

  // Set results per page to 100
  const selectElement = 'select[name="resultsPerPage"]';
  await page.waitForSelector(selectElement);
  const optionValue = '100';
  await page.select(selectElement, optionValue); 

  // Get the total number of pages
  const totalpages = 48; //48

  for (let pageNumber = 2; pageNumber <= totalpages; pageNumber++) {
//we start pg number2 as we ar going to scrape 1st then increment

     // Wait for a short time in ms before checking again
     await page.waitForTimeout(5000);
    // Wait for the page content to load
    await page.waitForSelector('a.title');
    // Extract links on the current page
    const links = await page.$$eval('a.title', anchors => {
      return anchors.map(anchor => ({
        href: anchor.href,
        textContent: anchor.textContent.trim()
      }));
    }); 


// Iterate through each link and navigate to the details page
for (const link of links) {
 
  // Open a new page for each link
  const detailsPage = await browser.newPage();
  
  // Navigate to the details page
  await detailsPage.goto(link.href);
  
  // Wait for a short time in ms before checking again
  await page.waitForTimeout(2000);
  // Perform scraping on the details page
  const pageTitle = await detailsPage.title();
  //console.log('Details Page Title:', pageTitle);

  // Use page.$$eval to extract text content from all <small> tags
  const medicaldetailslist = await detailsPage.$$eval('small.font-weight-bold', detailcontacts => detailcontacts.map(contact => contact.textContent.trim()));

// Convert the list of strings to a single string separated by commas
const medicaldetailsString = medicaldetailslist.join(", ");


  medical_details_record={"details":medicaldetailsString};
// Merge the two JSON objects
const new_medical_record = Object.assign({}, link, medical_details_record);
console.log('new_medical_record:', new_medical_record);

  // Output the extracted data
  outdata.push(new_medical_record);
  //console.log(`Text Content: ${link.textContent}, Href: ${link.href}`);

  // Close the details page after scraping
  await detailsPage.close();
}

   
    // Navigate to the next page
    if (pageNumber % 6 == 0) {
      
      // Click on the "Next" button if the page number is a multiple of 6
      const nextButtonSelector = '.pagination img[src*="pagination-right.svg"]';
      await page.waitForSelector(nextButtonSelector);
      await page.click(nextButtonSelector);
    } 
    // Click on page number[next]
  const pageNumberSelector = `#Skipto > section > div > div:nth-child(2) > div.col-md-12.col-lg-8.col-xl-9 > div > div.row.flex-space-between > div:nth-child(2) > div > div > ul > li:nth-child(${(pageNumber % 6)+1})`;
  // Wait for the element to be present in the DOM
  await page.waitForSelector(pageNumberSelector);
  await page.click(pageNumberSelector);   

  //finally wait for current page number to equal active page number
    // Add a loop to wait until the current page number equals the active page number
    while (true) {
      const activeLinkSelector = 'ul li a.active'; // Adjust the selector as needed
       await page.waitForSelector(activeLinkSelector);
     // Get the text content of the active link
      const activepagenumber = await page.$eval(activeLinkSelector, (link) => link.textContent);
      // Check if the current and active page numbers match
      if (pageNumber+1 == activepagenumber) {
        console.log('Current and active page numbers match. Exiting loop.');
        break;
      }
}


  }
 // Save data to Excel
 saveDataToExcel(outdata, `out.xlsx`);

  // Close the browser
  await browser.close();

})();



function saveDataToExcel(data, filename) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet 1');

  // Add headers
  worksheet.columns = [
    { header: 'title', key: 'textContent', width: 15 },
    { header: 'page_link', key: 'href', width: 15 },
    { header: 'contact', key: 'details', width: 15 },
  ];

  // Add data
  worksheet.addRows(data);

  // Save the workbook to a file
  workbook.xlsx.writeFile(filename)
    .then(() => {
      console.log(`Data saved to ${filename}`);
    })
    .catch((error) => {
      console.error('Error saving data to Excel:', error);
    });

  }

