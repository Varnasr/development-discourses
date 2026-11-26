# Content refresh, November 2026

This note records what changed in the library on 21 November 2026: the links that were repaired, the entries that were added, the candidates that were dropped and the topics that are still thin. Every address listed here was opened on 21 November 2026.

GitHub Pages publishes this repository from its root, and `README.md` and `CLAUDE.md` both answered 200 on the live site on that day. This file will therefore be public at `/docs/content-refresh-2026-11.md` once it is merged.

## Totals

The library holds 751 resources after merging duplicates (687 before). 382 are tagged open access, 124 free to read and 245 check access (338, 104 and 245 before). 75 resources are dated 2025 or later (26 before).

## How each entry was checked

- The landing page, the repository record or the PDF was opened, and the title, authors, year, series and DOI were copied from it by script.
- World Bank titles were read from the Open Knowledge Repository's own record for the handle, which is the record the landing page displays. NBER titles were read from the paper's page, and each PDF was downloaded once to confirm that it opens without payment. NBER limits how fast PDFs can be fetched, so several needed more than one attempt.
- An entry is tagged open access only where the page or the document states a Creative Commons licence. It is tagged free to read where the text opened without payment and no open licence was seen.
- Each summary was written from the abstract, the executive summary or the publisher's description, and says only what that text says.
- Each candidate was compared with the existing entries by normalised title, by DOI and by address. None matched.
- `verify_urls.py` then checked every new address. 63 answered 200. The UNHCR page answered 403 to the checker and is recorded as blocked; it opened through a browser-based fetch.

## The entry dated 2027

"Supporting learning in and out of school: Experimental evidence from India" by Martina Björkman Nyqvist and Andrea Guariso is a real article and the year is the publisher's. ScienceDirect lists it in the Journal of Development Economics, volume 184, January 2027, article 103906, published online on 21 August 2026 under CC BY 4.0 (DOI 10.1016/j.jdeveco.2026.103906). The year stays 2027. The entry now says when it appeared online and why the year reads 2027, names the volume, and is tagged open access.

## Links replaced

| Entry | Old address | New address | How it was confirmed |
|---|---|---|---|
| Humanitarian Response Index 2011 (DARA) | https://daraint.org/humanitarian-response-index/ | https://reliefweb.int/report/world/humanitarian-response-index-2011-addressing-gender-challenge | The old host fails its TLS certificate check. The ReliefWeb page answered 200 and is titled "Humanitarian Response Index 2011: Addressing the gender challenge", published by DARA on 2 March 2012. |
| Disability, Poverty and Development (DFID, 2000) | https://www.gov.uk/government/publications/disability-poverty-and-development | https://hpod.law.harvard.edu/pdf/Disability-poverty-and-development.pdf | The PDF was downloaded and its first pages read: a DFID issues paper with this title, dated February 2000. It is a copy held by the Harvard Law School Project on Disability, since no GOV.UK copy was found. |
| Internal Migration in India (UNESCO, UNICEF, 2013) | https://www.unesco.org/en/articles/internal-migration-india-initiative | https://unesdoc.unesco.org/ark:/48223/pf0000223702 | The UNESCO Digital Library record was opened: "Social inclusion of internal migrants in India", UNESCO Office in New Delhi, 2013. This is the 2013 report of the Internal Migration in India Initiative that the entry describes. The entry's title was left as it was. |
| The State of Mobile Internet Connectivity 2023 (GSMA) | https://www.gsma.com/r/wp-content/uploads/2023/10/The-State-of-Mobile-Internet-Connectivity-Report-2023.pdf | https://www.gsmaintelligence.com/research/the-state-of-mobile-internet-connectivity-2023 | The GSMA Intelligence page answered 200 and carries this title. |
| The Digital Financial Services Landscape (GSMA, 2023) | https://www.gsma.com/r/state-of-the-industry-report/ | https://www.gsma.com/solutions-and-impact/connectivity-for-good/mobile-for-development/gsma_resources/state-of-the-industry-report-on-mobile-money-2023-2/ | The GSMA page was opened: "State of the Industry Report on Mobile Money 2023", dated 20 April 2023, with a download link. The entry's description names this report; its title was left as it was. |
| Just Give Money to the Poor (Hanlon, Barrientos, Hulme, 2010) | https://www.routledge.com/Just-Give-Money-to-the-Poor-The-Development-Revolution-from-the-Global-South/Hanlon-Barrientos-Hulme/p/book/9781565493339 | https://www.rienner.com/title/Just_Give_Money_to_the_Poor_The_Development_Revolution_from_the_Global_South | The Lynne Rienner page answered 200 and lists the same book: the three authors, 2010, a Kumarian Press book, paperback ISBN 978-1-56549-333-9, which is the ISBN in the old address. |

All six new addresses were then checked by `verify_urls.py` and answered 200.

## Other corrections to existing entries

- The DARA entry was titled "Humanitarian Response Index 2011: Focus on Addressing Displacement". The 2011 edition is subtitled "Addressing the Gender Challenge", as the ReliefWeb page shows, and the title was corrected. Its page moved from `resource/humanitarian-response-index-2011-focus-on-addressing-displacement.html` to `resource/humanitarian-response-index-2011-addressing-the-gender-challenge.html`.
- The DFID entry is tagged free to read, because the PDF opened without payment and states no open licence.

## Links still dead

These five answered 404 and stay flagged as gone on their own pages. No replacement was put in, because each entry has a general title and pointed at a topic page or a feature story, and no document could be shown to be the one the entry meant.

- The Future of Work in the Global South (IDRC, 2019): https://idrc-crdi.ca/en/research-in-action/future-work-global-south
- Climate Migration and Urban Resilience (UN-Habitat, 2021): https://unhabitat.org/topics/climate-change
- Inclusive Education for Children with Disabilities (UNICEF, 2021): https://www.unicef.org/reports/education-children-disabilities
- The Economic Case for Investing in Mental Health (WHO, 2016): https://www.who.int/publications/i/item/9789241511810
- Ending Open Defecation: Lessons from the Swachh Bharat Mission (World Bank, 2019): https://www.worldbank.org/en/news/feature/2019/10/02/lessons-from-swachh-bharat

A sixth link is dead and is not flagged. The IDS entry "Social Protection in a Changing Climate" points at Figshare article 26201478. Figshare's API answered 404 for that article on 21 November 2026, as it did in October. The page itself answered the checker with 202 and a bot-challenge page, the checker counts any 2xx as ok, and so this run wrote `ok` over the earlier `broken` record. The record was left as the checker wrote it, because `link_status` is not edited by hand. A possible successor is Figshare article 26459881, "Social Protection and Climate Change" by Christophe Béné, IDS Bulletin 42(6), 2011. It has the same short title and a different type, author line and year, so it was not put in. Two decisions are the owner's: whether a 202 should count as unknown, and whether the Béné article is the document this entry meant.

Five links are recorded as unknown (timeouts, connection resets, a 405 and a 504) and 70 as blocked. Neither group was touched.

## Entries added

64 entries, all accessed on 21 November 2026.

### Agriculture & Food Systems (4 added, 36 in total)

- Brian Blankespoor, Susmita Dasgupta, Mainul Huq, Zahirul Huque Khan, Md. Golam Mustafa, David Wheeler (2025). Fishing and Climate Change in Coastal Bangladesh. DOI 10.1596/1813-9450-11048. https://openknowledge.worldbank.org/handle/10986/42735 Open access.
- Julian Arteaga, Klaus Deininger (2025). Yield Gains from Balancing Fertilizer Use. Policy Research Working Paper No. 11134. DOI 10.1596/1813-9450-11134. https://openknowledge.worldbank.org/handle/10986/43259 Open access.
- Ram Fishman, Meha Jain, Avinash Kishore (2025). When Water Runs Out: Adaptation to Gradual Environmental Change in Indian Agriculture. World Bank Economic Review. DOI 10.1093/wber/lhaf012. https://openknowledge.worldbank.org/handle/10986/44298 Open access.
- Susan Athey, Shawn Cole, Shanjukta Nath, Jessica Zhu (2026). Targeting, Personalization, and Engagement in an Agricultural Advisory Service. NBER Working Paper No. 34951. DOI 10.3386/w34951. https://www.nber.org/papers/w34951 Free to read.

### Climate & Environment (2 added, 48 in total)

- World Bank (2025). A Breath of Change: Solutions for Cleaner Air in the Indo-Gangetic Plains and Himalayan Foothills. DOI 10.1596/44067. https://openknowledge.worldbank.org/handle/10986/44067 Open access.
- World Bank Group (2025). Sri Lanka Country Climate and Development Report. DOI 10.1596/43995. https://openknowledge.worldbank.org/handle/10986/43995 Open access.

### Conflict & Humanitarian (3 added, 31 in total)

- Sandra V. Rozo, María José Urbina, Christina Wieser (2025). Beyond Camps and Communities: The Economics of Refugee Relocation in Bangladesh. Policy Research Working Paper No. 11204. DOI 10.1596/1813-9450-11204. https://openknowledge.worldbank.org/handle/10986/43681 Open access.
- World Bank, UNHCR (2025). Two Settlements, Two Diverging Paths: Jobs and Labor Market Outcomes for the Displaced Rohingya Population. DOI 10.1596/43707. https://openknowledge.worldbank.org/handle/10986/43707 Open access.
- UNHCR (2025). Global Trends: Forced Displacement in 2024. https://www.unhcr.org/global-trends-report-2024 Free to read.

### Data & Technology (3 added, 49 in total)

- Yuna Liang, Sylvan Rene Herskowitz, Antonio Martins-Neto, Sharada Srinivasan (2026). Access is Not Enough: How Smartphone Ownership Shapes Digital Services Use in Low- and Middle-Income Countries. DOI 10.1596/45009. https://openknowledge.worldbank.org/handle/10986/45009 Open access.
- Dante Donati, Nandan Rao, Victor Orozco-Olvera, Ana Maria Muñoz-Boudet (2024). Can Facebook Ads Prevent Malaria? Two Field Experiments in India. Policy Research Working Paper No. 10967. DOI 10.1596/1813-9450-10967. https://openknowledge.worldbank.org/handle/10986/42412 Open access.
- United Nations Development Programme (2025). Human Development Report 2025: A matter of choice: People and possibilities in the age of AI. https://hdr.undp.org/content/human-development-report-2025 Free to read.

### Development Economics (3 added, 55 in total)

- World Bank (2025). Bangladesh Poverty and Equity Assessment: Navigating the Road to Prosperity. DOI 10.1596/44419. https://openknowledge.worldbank.org/handle/10986/44419 Open access.
- World Bank (2025). Reclaiming Momentum Towards Prosperity: Pakistan's Poverty, Equity, and Resilience Assessment. DOI 10.1596/43722. https://openknowledge.worldbank.org/handle/10986/43722 Open access.
- World Bank (2025). World Development Report 2025: Standards for Development. DOI 10.1596/978-1-4648-2275-9. https://openknowledge.worldbank.org/handle/10986/43949 Open access.

### Disability & Inclusion (5 added, 31 in total)

- World Bank, UNICEF (2025). Methodological Guidelines on Assessing Household Disability: Related Costs and Their Implication for Participation. DOI 10.1596/43800. https://openknowledge.worldbank.org/handle/10986/43800 Open access.
- Mizanur Rahman, Md Shohel Rana, Md Mostafizur Rahman, Md Nuruzzaman Khan (2025). Exploring access to social protection by persons with disabilities in Bangladesh. PLOS ONE. DOI 10.1371/journal.pone.0321887. https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0321887 Open access.
- Shilpi Rani Saha, Soumik Saha (2024). Factors affecting school enrolment and attendance for children with disabilities in Bangladesh: Evidence from a cross-sectional survey. PLOS ONE. DOI 10.1371/journal.pone.0309402. https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0309402 Open access.
- Prashant Acharya (2026). Disability and educational outcomes in Nepal: Evidence from the 2019 Multiple Indicator Cluster Survey. PLOS Global Public Health. DOI 10.1371/journal.pgph.0006579. https://journals.plos.org/globalpublichealth/article?id=10.1371/journal.pgph.0006579 Open access.
- Muhammad Asim, Waqas Hameed, Sara Rotenberg, Dalia Chowdhury, Abid Lashari, Munazza Gillani, Abdul Ghaffar, Hannah Kuper (2026). Bringing legislation to life: Navigating intersectional barriers in implementing the Sindh Empowerment of Persons with Disabilities Act (2018) for the healthcare of children with disabilities. PLOS Global Public Health. DOI 10.1371/journal.pgph.0006562. https://journals.plos.org/globalpublichealth/article?id=10.1371/journal.pgph.0006562 Open access.

### Education (6 added, 34 in total)

- Umar Saif, Amer Hasan, Ayesha Tahir, Koen Geven, Mohsen Ali, Aliza Masood, Muhammad Abdul Rahman, Sheena Fazili (2026). Where Are Pakistan’s Out-of-School Children? Mapping Accessibility of Schooling Using Satellite Data and Machine Learning Methods with an Application to the 2022 Floods. Policy Research Working Paper No. 11341. DOI 10.1596/1813-9450-11341. https://openknowledge.worldbank.org/handle/10986/44537 Open access.
- Saher Asad, A. Patrick Behrer, Martin Philipp Heger, Monica Yanez Pagans (2026). Air Pollution and Student Learning in Pakistan. Policy Research Working Paper No. 11463. DOI 10.1596/1813-9450-11463. https://openknowledge.worldbank.org/handle/10986/45629 Open access.
- Rafiuddin Najam, Harry Anthony Patrinos, Raja Bentaouet Kattan (2024). The Mis-Education of Women in Afghanistan. Policy Research Working Paper No. 10888. DOI 10.1596/1813-9450-10888. https://openknowledge.worldbank.org/handle/10986/42117 Open access.
- Tahir Andrabi, Jishnu Das, Asim Ijaz Khwaja, Selcuk Ozyurt (2025). Helping Schools Survive: Experimental Evidence on the Impact of Financial and Educational Support to Private Schools. NBER Working Paper No. 34042. DOI 10.3386/w34042. https://www.nber.org/papers/w34042 Free to read.
- Global Education Monitoring Report Team (2024). Global Education Monitoring Report 2024/5: Leadership in education: Lead for learning. https://www.unesco.org/gem-report/en/publication/leadership Free to read.
- ASER Centre, Pratham (2025). Annual Status of Education Report (ASER) 2024: National findings. https://asercentre.org/aser-2024/ Free to read.

### Energy & Just Transition (2 added, 20 in total)

- Hyun Jin Choi, Saadia Qayyum, Bryan Bonsuk Koo (2024). Pakistan Energy Survey - Insights into the True Energy Access Situation in Pakistan Based on the Multi-Tier Framework. DOI 10.1596/41817. https://openknowledge.worldbank.org/handle/10986/41817 Open access.
- Nina R. Brooks, Debashish Biswas, Sameer Maithel, Grant Miller, Aprajit Mahajan, M. Rofi Uddin, Shoeb Ahmed, Moogdho Mahzab, Mahbubur Rahman, Stephen P. Luby (2024). Reducing Emissions and Air Pollution from the Informal Sector: Evidence from Bangladesh. NBER Working Paper No. 32794. DOI 10.3386/w32794. https://www.nber.org/papers/w32794 Free to read.

### Financial Inclusion (2 added, 30 in total)

- Klaus W. Deininger, Daniel Ayalew Ali, Hari K. Nagarajan, Abhiman Das, Parth Hirpara (2026). Digital Land Rights and Rural Credit Access: Lessons from Village Habitation (Abadi) Land Titling in India. Policy Research Working Paper No. 11502. DOI 10.1596/1813-9450-11502. https://openknowledge.worldbank.org/handle/10986/45873 Open access.
- Leora Klapper, Dorothe Singer, Laura Starita, Alexandra Norris (2025). The Global Findex Database 2025: Connectivity and Financial Inclusion in the Digital Economy. DOI 10.1596/978-1-4648-2204-9. https://openknowledge.worldbank.org/handle/10986/43438 Open access.

### Gender & Social Inclusion (4 added, 49 in total)

- World Bank (2024). South Asia Development Update, October 2024: Women, Jobs, and Growth. DOI 10.1596/978-1-4648-2170-7. https://openknowledge.worldbank.org/handle/10986/42002 Open access.
- Jumana Alaref, Aishwarya Patil, Tasmia Rahman, Ana Maria Munoz Boudet, Jasmine Rajbhandary (2024). Women’s Labor Force Participation in Nepal. Policy Research Working Paper No. 10810. DOI 10.1596/1813-9450-10810. https://openknowledge.worldbank.org/handle/10986/41743 Open access.
- Maurizio Bussolo, Jonah Rexer, Margaret Triyana (2024). Education, Social Norms, and the Marriage Penalty. Policy Research Working Paper No. 10946. DOI 10.1596/1813-9450-10946. https://openknowledge.worldbank.org/handle/10986/42252 Open access.
- Yueh-ya Hsu, Reshmaan N. Hussam, Erin M. Kelley, Gregory Lane (2026). Household Preferences for Women’s Employment: A Field Experiment in Bangladesh. NBER Working Paper No. 34969. DOI 10.3386/w34969. https://www.nber.org/papers/w34969 Free to read.

### Livelihoods (5 added, 59 in total)

- World Bank (2025). South Asia Development Update, October 2025: Jobs, AI, and Trade. DOI 10.1596/978-1-4648-2291-9. https://openknowledge.worldbank.org/handle/10986/43743 Open access.
- Jumana Alaref, Laurine Martinoty, Aishwarya Patil, Mohamed Ihsan Ajwad, Jasmine Rajbhandary (2026). Survival or Growth? Nepal’s Microenterprise Landscape and the Case for a Differentiated Policy Approach. DOI 10.1596/45086. https://openknowledge.worldbank.org/handle/10986/45086 Open access.
- Achyuta Adhvaryu, Levina Adiputri, Valentina Brailovskaya, Priyanka Dua, Jenny Susan John, Pratibha Joshi, Terry Muthahhari, Rivandra Royono, Jack Thunde (2026). Women in the Platform Economy: Descriptive Evidence from Drivers in India and Indonesia. NBER Working Paper No. 35467. DOI 10.3386/w35467. https://www.nber.org/papers/w35467 Free to read.
- Samantha Carter, Edward Jee, Dean Karlan, Patrick Premand (2026). Doing Better at Doing Good: Lessons from a Bayesian Meta-Analysis After 20 Years of Poverty Graduation Programs. NBER Working Paper No. 35991. DOI 10.3386/w35991. https://www.nber.org/papers/w35991 Free to read.
- International Labour Organization, Institute for Human Development (2024). India Employment Report 2024: Youth employment, education and skills. https://www.ilo.org/publications/india-employment-report-2024-youth-employment-education-and-skills Open access.

### MEAL & Evaluation (2 added, 46 in total)

- Independent Evaluation Group, World Bank (2024). An Evaluation of World Bank and International Finance Corporation Engagement of Gender Equality over the Past 10 Years. DOI 10.1596/IEG193623. https://openknowledge.worldbank.org/handle/10986/42382 Open access.
- Emanuele Colonnelli, Timothy McQuade, Natalia Rigol, Benjamin N. Roth (2026). Measuring the Impact of Impact Measurement. NBER Working Paper No. 36009. DOI 10.3386/w36009. https://www.nber.org/papers/w36009 Free to read.

### Mental Health & Wellbeing (4 added, 22 in total)

- Mahreen Tahir-Chowdhry, Elizabeth Hentschel, Heather Tomlinson, Amna Ansari, Amer Hasan, Aisha Yousafzai, Naveed Hussain (2024). Maternal Mental Health and Its Influence on Children’s Early Development. Policy Research Working Paper No. 10975. DOI 10.1596/1813-9450-10975. https://openknowledge.worldbank.org/handle/10986/42445 Open access.
- Eric V. Edmonds, Priya Mukherjee, Nikhilesh Prakash, Nishith Prakash, Shwetlena Sabarwal (2025). Talk Therapy and Human Capital in Adolescence: Evidence from Nepal. NBER Working Paper No. 33677. DOI 10.3386/w33677. https://www.nber.org/papers/w33677 Free to read.
- Tahir Andrabi, Benjamin Daniels, Jishnu Das (2026). The Emergence of the Poverty–Mental Health Gradient and the Great Pakistan Earthquake of 2005. NBER Working Paper No. 35060. DOI 10.3386/w35060. https://www.nber.org/papers/w35060 Free to read.
- World Health Organization (2025). World mental health today: latest data. https://www.who.int/publications/i/item/9789240113817 Open access.

### Migration & Urbanization (4 added, 35 in total)

- World Bank (2025). Nepal Country Economic Memorandum. DOI 10.1596/42978. https://openknowledge.worldbank.org/handle/10986/42978 Open access.
- World Bank Group (2025). Towards Resilient and Prosperous Cities in India. DOI 10.1596/43242. https://openknowledge.worldbank.org/handle/10986/43242 Open access.
- Nicholas Jones, Asmita Tiwari, Natsuko Kikutake, Sacha Takacs, Niels Souverijns (2024). Prioritizing Heat Mitigation Actions in Indian Cities. Policy Research Working Paper No. 10960. DOI 10.1596/1813-9450-10960. https://openknowledge.worldbank.org/handle/10986/42350 Open access.
- Lori A. Beaman, Seema Jayachandran, Anisha Sharma (2026). The City Through Her Eyes: Gender-Based Harassment in Public Spaces in Urban India. NBER Working Paper No. 35738. DOI 10.3386/w35738. https://www.nber.org/papers/w35738 Free to read.

### Public Health (2 added, 39 in total)

- Edson C. Araujo, Bernardo D. P. Coelho, Gumilang Aryo Sahadewo, Navneet Kaur Manchanda, Barbara McPake, Ajay Mahal, Lakshmi Murthy Sripada, Deepak Santhanakrishnan, Aarushi Bhatnagar (2025). An Overview of the Indian Health Labor Markets. DOI 10.1596/43787. https://openknowledge.worldbank.org/handle/10986/43787 Open access.
- Adeline L. Delavande, Areeba Shahab, Javed Younas, Basit Zafar (2025). Improving Childhood Immunization through Maternal Support: Evidence from a Randomized Intervention in Pakistan. NBER Working Paper No. 33559. DOI 10.3386/w33559. https://www.nber.org/papers/w33559 Free to read.

### Public Policy & Governance (4 added, 59 in total)

- World Bank (2025). South Asia Development Update, April 2025: Taxing Times. DOI 10.1596/978-1-4648-2230-8. https://openknowledge.worldbank.org/handle/10986/42891 Open access.
- Thaneshwar Bhusal, Michael G Breen, Vijayendra Rao (2025). The Evolution of Local Participatory Democracy in Nepal. Policy Research Working Paper No. 11252. DOI 10.1596/1813-9450-11252. https://openknowledge.worldbank.org/handle/10986/43939 Open access.
- Beenish Amjad, Haydeeliz Carassco, Moritz Meyer (2025). The Effects of Taxes and Transfers on Inequality and Poverty in Pakistan. DOI 10.1596/43125. https://openknowledge.worldbank.org/handle/10986/43125 Open access.
- Esther Duflo, Rema Hanna, Benjamin A. Olken, Shreya Tandon (2026). The Limits of Government Outsourcing: Property Tax Re-Assessments in India. NBER Working Paper No. 35610. DOI 10.3386/w35610. https://www.nber.org/papers/w35610 Free to read.

### Research Methods (4 added, 57 in total)

- Hai-Anh H. Dang, Minh Do, Partha Lahiri, Melany Gualavisi, David Newhouse, Talip Kilic, Peter Lanjouw, Roy Van der Weide (2026). Evaluating Alternative Approaches to Small Area Estimation of Poverty with Survey and Census Data. Policy Research Working Paper No. 11396. DOI 10.1596/1813-9450-11396. https://openknowledge.worldbank.org/handle/10986/44941 Open access.
- Isabel Molina (2024). Frontiers in Small Area Estimation Research. Policy Research Working Paper No. 10828. DOI 10.1596/41801. https://openknowledge.worldbank.org/handle/10986/41801 Open access.
- Andrew Baker, Brantly Callaway, Scott Cunningham, Andrew Goodman-Bacon, Pedro H. C. Sant'Anna (2025). Difference-in-Differences Designs: A Practitioner's Guide. arXiv:2503.13323. https://arxiv.org/abs/2503.13323 Open access.
- Victor Chernozhukov, Christian Hansen, Nathan Kallus, Martin Spindler, Vasilis Syrgkanis (2024). Applied Causal Inference Powered by ML and AI. arXiv:2403.02467. https://arxiv.org/abs/2403.02467 Free to read.

### Social Protection (3 added, 37 in total)

- Zaineb Majoka, Yash Dhuldhoya (2026). Responding to Floods in Pakistan with Adaptive Social Protection: How to Keep an Inundated Country Afloat. DOI 10.1596/44628. https://openknowledge.worldbank.org/handle/10986/44628 Open access.
- Paul J. Christian, Felipe A. Dunsch, Jonas Heirman, Erin M. Kelley, Florence Kondylis, Gregory Lane, Jennifer Waidler, Nidhila Adusumalli, Odbayar Batmunkh, Kriti Malhotra (2025). Fast Action for Floods: RCT Evidence on Forecast-based Cash Transfers from Bangladesh and Nepal. NBER Working Paper No. 34414. DOI 10.3386/w34414. https://www.nber.org/papers/w34414 Free to read.
- Emily Aiken, Anik Ashraf, Joshua Blumenstock, Raymond Guiteras, Ahmed Mushfiq Mobarak (2025). Scalable Targeting of Social Protection: When Do Algorithms Out-Perform Surveys and Community Knowledge?. NBER Working Paper No. 33919. DOI 10.3386/w33919. https://www.nber.org/papers/w33919 Free to read.

### WASH (2 added, 38 in total)

- World Bank, Asian Development Bank (ADB) (2025). Water and Sanitation in Indian Cities: Knowledge Framework for Promoting Sustainable and Bankable Water Supply, Sanitation, and Solid Waste Management. DOI 10.1596/44073. https://openknowledge.worldbank.org/handle/10986/44073 Open access.
- World Health Organization, UNICEF (2025). Progress on household drinking-water, sanitation and hygiene 2000-2024: Special focus on inequalities. https://www.who.int/publications/m/item/progress-on-household-drinking-water--sanitation-and-hygiene-2000-2024--special-focus-on-inequalities Free to read.

## Candidates dropped

- UN Disability and Development Report 2024 (UN DESA). The page answered 405 to a direct request and could not be opened by the scraper either, so nothing about it was confirmed.
- Tracking SDG 7: The Energy Progress Report 2025. The site answered 403 and the report page was not opened.
- The State of Food Security and Nutrition in the World 2025 (FAO). The FAO repository did not answer and the page was not opened.
- Nepal Country Program Evaluation (Independent Evaluation Group, handle 10986/40888). The record describes what the evaluation will assess, so the document is a plan for an evaluation and not the evaluation.
- Evaluating Experimental Designs (NBER w34031). It is the introduction to a handbook on laboratory and survey experiments, with no development or South Asia content.
- Target What? The Foundations of Poverty Targeting (NBER w35984). The study is set in Indonesia.
- Including Persons with Disabilities in Emergency Preparedness and Response (handle 10986/44686). The record describes a regional diagnostic of 38 countries tied to European civil protection, and names no South Asian country.
- Eight further World Bank titles on Pakistan, Bangladesh, Nepal and India (handles 10986/43416, 45092, 43822, 45688, 43570, 43556, 42655 and 42589). Their records were read and they are sound candidates. They were left out because 37 of the 64 additions already come from that one publisher.
- About 100 PLOS articles returned by Crossref searches. Only the four that were opened and that concern disability in Bangladesh, Nepal and Pakistan were taken.

## What this pass did not reach

No entry was added from The Lancet's regional journals, BMJ Global Health, World Development, Economic and Political Weekly, IZA, CGD, IFPRI, IGC, J-PAL, 3ie, the Campbell Collaboration, ODI, UNU-WIDER, the Reserve Bank of India, NITI Aayog or the Ministry of Statistics (PLFS, HCES, NFHS). Several of those sites refuse direct requests, and the time went to checking the entries above. The additions lean on the World Bank (37) and NBER (14). A second pass should start with those sources.

Sri Lanka has one new entry (the Country Climate and Development Report) and Afghanistan one. India, Bangladesh, Pakistan and Nepal are each covered by several.

## Topics still thin

| Topic | Resources | Dated 2024 or later |
|---|---|---|
| Energy & Just Transition | 20 | 8 |
| Mental Health & Wellbeing | 22 | 8 |
| Financial Inclusion | 30 | 6 |
| Conflict & Humanitarian | 31 | 5 |
| Disability & Inclusion | 31 | 5 |
| Education | 34 | 11 |
| Migration & Urbanization | 35 | 5 |
| Agriculture & Food Systems | 36 | 6 |
| Social Protection | 37 | 7 |
| WASH | 38 | 6 |
| Public Health | 39 | 13 |
| MEAL & Evaluation | 46 | 2 |
| Climate & Environment | 48 | 11 |
| Data & Technology | 49 | 6 |
| Gender & Social Inclusion | 49 | 7 |
| Development Economics | 55 | 6 |
| Research Methods | 57 | 4 |
| Livelihoods | 59 | 7 |
| Public Policy & Governance | 59 | 8 |

Energy & Just Transition and Mental Health & Wellbeing are the smallest topics. MEAL & Evaluation and Research Methods have the least recent material for their size: two and four entries dated 2024 or later. Disability & Inclusion had none before this pass and has five now, four of them single-country survey analyses.

## Other notes

- `enrich_data.py` now reads an optional `access_observed` field and lets it win over the access label it guesses from the address. The 64 new entries, the 2027 entry and the DFID entry carry it. About 40 older entries record a Creative Commons licence and are still tagged check access because their address is a DOI. They were not changed, because their pages were not opened in this pass.
- `CACHE_VERSION` in `service-worker.js` was not changed. The worker fetches `data/*.json` from the network first, and `index.html`, `resource.html`, the stylesheets and the scripts did not change. A returning visitor who had already opened one of the changed resource pages will see the cached copy once, and the worker replaces it in the background.
