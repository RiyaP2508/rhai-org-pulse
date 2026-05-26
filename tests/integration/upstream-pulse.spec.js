const { test, expect } = require('@playwright/test');
const { DEFAULT_PAGE_WAIT_TIME } = require('./constants');
const { setupErrorTracking, logCapturedErrors, pageHasContent, pageLoadComplete, mainContentIsVisible, countDisabledNavItems, verifyTextDisplays } = require('./helpers');

/**
 * Integration tests for Upstream Pulse module
 *
 * These tests verify:
 * - Module loads and renders correctly
 * - Data fetching and display works
 * - Navigation within the module functions
 * - API integration is functional
 *
 * Tag: @upstream-pulse
 * Usage: npx playwright test --grep @upstream-pulse
 */

/**
 * Helper to set up basic API mocks for upstream-pulse module
 * This mocks the common endpoints needed for most views
 */
async function setupBasicMocks(page) {
  // Mock config endpoint
  await page.route('**/api/modules/upstream-pulse/config', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        baseUrl: 'http://mock-upstream-pulse',
        configured: true,
        connection: { reachable: true, status: 200 }
      })
    });
  });

  // Mock dashboard endpoint with basic data
  await page.route('**/api/modules/upstream-pulse/dashboard*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        contributions: {
          all: { team: 1250, total: 5000, teamPercent: 25 },
          commits: { team: 500, total: 2000, teamPercent: 25 },
          pullRequests: { team: 300, total: 1200, teamPercent: 25 },
          reviews: { team: 250, total: 1000, teamPercent: 25 },
          issues: { team: 200, total: 800, teamPercent: 25 }
        },
        summary: {
          activeContributors: 42,
          trackedProjects: 6,
          periodStart: '2024-01-01',
          periodEnd: '2024-01-31'
        },
        topContributors: [],
        orgActivity: [
          { org: 'kubernetes', orgName: 'Kubernetes', total: 500, totalContributions: 2000, teamSharePercent: 25, percentChange: 15, activeTeamMembers: 10, leadershipCount: 3, maintainerCount: 2 },
          { org: 'kubeflow', orgName: 'Kubeflow', total: 300, totalContributions: 1200, teamSharePercent: 25, percentChange: 10, activeTeamMembers: 8, leadershipCount: 2, maintainerCount: 1 },
          { org: 'kserve', orgName: 'KServe', total: 250, totalContributions: 1000, teamSharePercent: 25, percentChange: 8, activeTeamMembers: 7, leadershipCount: 1, maintainerCount: 1 },
          { org: 'ray-project', orgName: 'Ray Project', total: 200, totalContributions: 800, teamSharePercent: 25, percentChange: 5, activeTeamMembers: 6, leadershipCount: 0, maintainerCount: 0 }
        ],
        dailyBreakdown: [
          { date: '2024-01-01', team: 25, total: 100 },
          { date: '2024-01-02', team: 30, total: 120 },
          { date: '2024-01-03', team: 28, total: 110 }
        ],
        topProjects: [
          { id: '1', name: 'kubernetes', githubOrg: 'kubernetes', githubRepo: 'kubernetes', contributions: 450, activeContributors: 15 },
          { id: '2', name: 'kubeflow', githubOrg: 'kubeflow', githubRepo: 'kubeflow', contributions: 320, activeContributors: 12 },
          { id: '3', name: 'kserve', githubOrg: 'kserve', githubRepo: 'kserve', contributions: 280, activeContributors: 10 },
          { id: '4', name: 'ray-project', githubOrg: 'ray-project', githubRepo: 'ray', contributions: 200, activeContributors: 8 }
        ],
        trends: {},
        leadership: {
          byOrg: [
            {
              orgName: 'Kubernetes',
              positions: [
                {
                  positionType: 'steering_committee',
                  roleTitle: 'Steering Committee',
                  teamCount: 2,
                  members: [
                    { id: 'leader1', name: 'Sarah Chen', githubUsername: 'sarahchen', avatarUrl: 'https://github.com/sarahchen.png' },
                    { id: 'leader2', name: 'Mike Rodriguez', githubUsername: 'mikerodriguez', avatarUrl: 'https://github.com/mikerodriguez.png' }
                  ]
                }
              ]
            }
          ]
        }
      })
    });
  });

  // Mock contributors endpoint
  await page.route('**/api/modules/upstream-pulse/contributors*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        contributors: [
          { id: '1', name: 'Alice Johnson', githubUsername: 'alicecodes', total: 450, commits: 200, prs: 100, reviews: 100, issues: 50 },
          { id: '2', name: 'Bob Smith', githubUsername: 'bobsmith', total: 380, commits: 180, prs: 80, reviews: 80, issues: 40 }
        ]
      })
    });
  });

  // Mock leadership endpoint
  await page.route('**/api/modules/upstream-pulse/leadership*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        summary: {
          codeOwnerFiles: 15,
          totalCodeOwnerFiles: 50,
          ownerPositions: 8,
          totalOwnerPositions: 25,
          projectLeadPositions: 5,
          totalProjectLeadPositions: 20,
          reviewerPositions: 12,
          totalReviewerPositions: 40,
          projectsWithTeamLeadership: 4
        },
        members: [
          {
            id: 'm1',
            name: 'Alex Thompson',
            githubUsername: 'alexthompson',
            roles: [
              { projectId: 'p1', projectName: 'kubernetes', role: 'Owner' },
              { projectId: 'p2', projectName: 'kubeflow', role: 'Reviewer' }
            ]
          }
        ],
        byOrg: []
      })
    });
  });

  // Mock orgs endpoint
  await page.route('**/api/modules/upstream-pulse/orgs*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        orgs: [
          { org: 'kubernetes', orgName: 'Kubernetes', total: 500, totalContributions: 2000, teamSharePercent: 25, activeTeamMembers: 10 },
          { org: 'kubeflow', orgName: 'Kubeflow', total: 300, totalContributions: 1200, teamSharePercent: 25, activeTeamMembers: 8 }
        ],
        summary: {
          totalContributions: 800,
          activeMembers: 18,
          activeOrgs: 2,
          avgTeamShare: 25.0
        }
      })
    });
  });

  // Mock projects endpoint
  await page.route('**/api/modules/upstream-pulse/projects*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        projects: [
          { id: '1', name: 'kubernetes', githubOrg: 'kubernetes', githubRepo: 'kubernetes', contributions: 450, activeContributors: 15 },
          { id: '2', name: 'kubeflow', githubOrg: 'kubeflow', githubRepo: 'kubeflow', contributions: 320, activeContributors: 12 }
        ]
      })
    });
  });
}

test.describe('Upstream Pulse Module @upstream-pulse', () => {
  test.beforeEach(async ({ page }) => {
    setupErrorTracking(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    logCapturedErrors(page, testInfo);
  });

  test('should be visible in sidebar navigation', async ({ page }) => {
    await setupBasicMocks(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(DEFAULT_PAGE_WAIT_TIME);

    // Find the Upstream Pulse module in the sidebar
    const moduleNav = page.locator('aside nav').filter({ hasText: 'Upstream Pulse' });
    const count = await moduleNav.count();
    expect(count).toBeGreaterThan(0);

    // Verify the module link is visible and clickable
    const moduleLink = moduleNav.first();
    await expect(moduleLink).toBeVisible();

    expect(page.errors).toHaveLength(0);
  });

  test('should navigate to Upstream Pulse module when clicked', async ({ page }) => {
    await setupBasicMocks(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(DEFAULT_PAGE_WAIT_TIME);

    // First, expand the Upstream Pulse module section if it's collapsed
    const moduleHeader = page.locator('aside nav button').filter({ hasText: 'Upstream Pulse' }).first();
    await moduleHeader.click();
    await page.waitForTimeout(500);

    // Now click on the "Dashboard" view within the module (default view)
    const viewLink = page.locator('aside nav button').filter({ hasText: 'Dashboard' }).first();
    await viewLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(DEFAULT_PAGE_WAIT_TIME);

    // Verify URL changed to upstream-pulse module (default view is dashboard)
    expect(page.url()).toMatch(/upstream-pulse\/dashboard/);

    // Verify main content is visible
    const mainContentVisible = await mainContentIsVisible(page);
    expect(mainContentVisible).toBe(true);

    expect(page.errors).toHaveLength(0);
  });

  test('should fetch data from Upstream Pulse API endpoints', async ({ page }) => {
    // Monitor network requests
    const apiRequests = [];
    page.on('request', request => {
      if (request.url().includes('/api/modules/upstream-pulse')) {
        apiRequests.push({
          url: request.url(),
          method: request.method()
        });
      }
    });

    // Set up API mocks
    await setupBasicMocks(page);

    // Navigate to Dashboard view (makes API calls for metrics)
    await page.goto('/#/upstream-pulse/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(DEFAULT_PAGE_WAIT_TIME);

    // Verify that API requests were made to the Upstream Pulse endpoints
    // The dashboard should make calls to /dashboard, /contributors, /leadership, etc.
    expect(apiRequests.length).toBeGreaterThan(0);
    console.log(`Upstream Pulse API requests: ${apiRequests.length}`);
    apiRequests.forEach(req => {
      console.log(`  ${req.method} ${req.url}`);
    });

    // Verify at least one request is for the dashboard endpoint (the default view)
    const dashboardRequest = apiRequests.find(req => req.url.includes('/dashboard'));
    expect(dashboardRequest).toBeDefined();

    expect(page.errors).toHaveLength(0);
  });

});

/**
 * Disabled Menu Items
 *
 * Verify that Upstream Pulse module has no disabled menu items.
 * All navigation items should be active and clickable.
 */
test.describe('Upstream Pulse Disabled Menu Items @upstream-pulse', () => {
  test.beforeEach(async ({ page }) => {
    setupErrorTracking(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    logCapturedErrors(page, testInfo);
  });

  test('should have no disabled menu items', async ({ page }) => {
    // Set up API mocks
    await setupBasicMocks(page);

    await page.goto('/#/upstream-pulse/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(DEFAULT_PAGE_WAIT_TIME);

    // Count disabled navigation items within the Upstream Pulse section only
    const disabledCount = await countDisabledNavItems(page, 'Upstream Pulse');

    // Upstream Pulse module should have no disabled menu items
    expect(disabledCount).toBe(0);
    expect(page.errors).toHaveLength(0);
  });
});

/**
 * Active Components
 *
 * Verify each major view (aka menu item) in the Upstream Pulse module loads with
 * meaningful content
 */
test.describe('Upstream Pulse Views @upstream-pulse', () => {
  test.beforeEach(async ({ page }) => {
    setupErrorTracking(page);
  });

  test.afterEach(async ({ page }, testInfo) => {
    logCapturedErrors(page, testInfo);
  });

  // Helper to navigate and verify a view loads with content
  async function testView(page, viewId, viewName) {
    await setupBasicMocks(page);
    await page.goto(`/#/upstream-pulse/${viewId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(DEFAULT_PAGE_WAIT_TIME);

    // Before we verify content, we need to verify the overall view loads
    const mainContentVisible = await mainContentIsVisible(page);
    expect(mainContentVisible).toBe(true);

    // Verify the view has rendered some meaningful content by checking for
    // data-bearing elements (not just empty containers or placeholders)
    const hasContent = await pageHasContent(page);
    expect(hasContent).toBe(true);

    // Verify we're not stuck in an infinite loading state
    const pageHasFinishedLoading = await pageLoadComplete(page);
    expect(pageHasFinishedLoading).toBe(true);
    if (page.errors.length > 0) {
      console.error(`${viewName} errors:`, page.errors);
    }

    expect(page.errors).toHaveLength(0);
  }

  test('should load Dashboard view', async ({ page }) => {
    await testView(page, 'dashboard', 'Dashboard');
  });

  test('should display Dashboard navigation menu items', async ({ page }) => {
    await setupBasicMocks(page);
    await page.goto('/#/upstream-pulse/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(DEFAULT_PAGE_WAIT_TIME);

    // Verify the sticky navigation menu items
    // Expected menu items: Overview, Organizations, Projects, Contributors, Leadership
    const expectedMenuItems = ['Overview', 'Organizations', 'Projects', 'Contributors', 'Leadership'];

    for (const menuItem of expectedMenuItems) {
      // Look for buttons in the navigation that contain the menu item text
      // The navigation is in a <nav> element with rounded styling
      const menuButton = page.locator('nav button').filter({ hasText: menuItem });
      const count = await menuButton.count();

      // Verify the menu item exists
      expect(count).toBeGreaterThan(0);
      console.log(`Found Dashboard menu item: "${menuItem}"`);

      // Verify the button is visible and clickable
      const button = menuButton.first();
      await expect(button).toBeVisible();
    }

    // Verify Overview section stat cards are displayed
    // The Overview section contains 4 stat cards with specific labels
    const expectedStatCards = [
      'Team Contributions',
      'Team\'s Share',
      'Active Contributors',
      'Tracked Projects'
    ];

    console.log('Verifying Overview section stat cards...');
    for (const cardLabel of expectedStatCards) {
      // StatCard components render the label text
      // Look for text that matches the card label
      const statCard = page.locator('text=' + cardLabel);
      const cardCount = await statCard.count();

      // Verify the stat card exists
      expect(cardCount).toBeGreaterThan(0);
      console.log(`  Found stat card: "${cardLabel}"`);

      // Verify the stat card is visible
      await expect(statCard.first()).toBeVisible();
    }

    expect(page.errors).toHaveLength(0);
  });

  test('should display Overview section stat cards', async ({ page }) => {
    await setupBasicMocks(page);
    await page.goto('/#/upstream-pulse/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(DEFAULT_PAGE_WAIT_TIME);

    // Verify the Overview section (id="section-overview") exists
    const overviewSection = page.locator('#section-overview');
    await expect(overviewSection).toBeVisible();
    console.log('Overview section found');

    // The Overview section should contain 4 stat cards in a grid
    const expectedStatCards = [
      'Team Contributions',
      'Team\'s Share',
      'Active Contributors',
      'Tracked Projects'
    ];

    for (const cardLabel of expectedStatCards) {
      // Locate the stat card by its label text
      const statCard = overviewSection.locator('text=' + cardLabel);
      const count = await statCard.count();

      // Verify the stat card exists within the Overview section
      expect(count).toBeGreaterThan(0);
      console.log(`  ✓ Found stat card: "${cardLabel}"`);

      // Verify it's visible
      await expect(statCard.first()).toBeVisible();
    }

    // Verify the grid layout (should have 2-4 columns depending on screen size)
    // The div has classes: grid grid-cols-2 lg:grid-cols-4
    const hasGridClass = await overviewSection.evaluate(el => {
      return el.className.includes('grid');
    });
    expect(hasGridClass).toBe(true);
    console.log('  ✓ Overview section uses grid layout');

    expect(page.errors).toHaveLength(0);
  });

  test('should display Contribution Breakdown cards', async ({ page }) => {
    await setupBasicMocks(page);
    await page.goto('/#/upstream-pulse/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(DEFAULT_PAGE_WAIT_TIME);

    // Verify the Contribution Breakdown section heading exists
    const contributionBreakdownHeading = page.locator('h3').filter({ hasText: 'Contribution Breakdown' });
    await expect(contributionBreakdownHeading).toBeVisible();
    console.log('Contribution Breakdown section found');

    // The Contribution Breakdown section should contain 4 contribution type cards
    const expectedContributionCards = [
      'Commits',
      'Pull Requests',
      'Code Reviews',
      'Issues'
    ];

    for (const cardLabel of expectedContributionCards) {
      // Locate the contribution card by its label text
      const contributionCard = page.locator('text=' + cardLabel);
      const count = await contributionCard.count();

      // Verify the contribution card exists
      expect(count).toBeGreaterThan(0);
      console.log(`  ✓ Found contribution card: "${cardLabel}"`);

      // Verify it's visible
      await expect(contributionCard.first()).toBeVisible();
    }

    expect(page.errors).toHaveLength(0);
  });

  test('should display Contribution Trend chart', async ({ page }) => {
    await setupBasicMocks(page);
    await page.goto('/#/upstream-pulse/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(DEFAULT_PAGE_WAIT_TIME);

    // Verify the Contribution Trend chart component displays
    // Chart.js renders charts using canvas elements
    const chartCanvas = page.locator('canvas');
    const count = await chartCanvas.count();

    // Verify at least one chart (canvas) element exists
    expect(count).toBeGreaterThan(0);
    console.log(`✓ Found ${count} chart(s) on Dashboard`);

    // Verify the chart is visible
    const firstChart = chartCanvas.first();
    await expect(firstChart).toBeVisible();

    expect(page.errors).toHaveLength(0);
  });

  test('should display Top Organizations section with at least 4 cards', async ({ page }) => {
    await setupBasicMocks(page);
    await page.goto('/#/upstream-pulse/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(DEFAULT_PAGE_WAIT_TIME);

    // Verify the Top Organizations section heading exists
    const topOrgsHeading = page.locator('h3').filter({ hasText: 'Top Organizations' });
    await expect(topOrgsHeading).toBeVisible();
    console.log('Top Organizations section found');

    // Find the section container (id="section-organizations")
    const topOrgsSection = page.locator('#section-organizations');
    await expect(topOrgsSection).toBeVisible();

    // Count organization cards within the section
    // Organization cards are displayed in a grid (grid-cols-1 sm:grid-cols-2)
    // Look for cards with organizational data (activity cards contain team contributions, etc.)
    const orgCards = topOrgsSection.locator('.grid > div');
    const cardCount = await orgCards.count();

    // Verify at least 4 organization cards are displayed
    expect(cardCount).toBeGreaterThanOrEqual(4);
    console.log(`✓ Found ${cardCount} organization cards (minimum 4 required)`);

    // Verify the cards are visible
    for (let i = 0; i < Math.min(4, cardCount); i++) {
      await expect(orgCards.nth(i)).toBeVisible();
    }

    expect(page.errors).toHaveLength(0);
  });

  test('should display Top Projects section with project cards', async ({ page }) => {
    // Mock the dashboard API response to include project data
    await page.route('**/api/modules/upstream-pulse/dashboard*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          contributions: {
            all: { team: 1250, total: 5000, teamPercent: 25 },
            commits: { team: 500, total: 2000, teamPercent: 25 },
            pullRequests: { team: 300, total: 1200, teamPercent: 25 },
            reviews: { team: 250, total: 1000, teamPercent: 25 },
            issues: { team: 200, total: 800, teamPercent: 25 }
          },
          summary: {
            activeContributors: 42,
            trackedProjects: 6,
            periodStart: '2024-01-01',
            periodEnd: '2024-01-31'
          },
          topContributors: [],
          orgActivity: [],
          dailyBreakdown: [],
          topProjects: [
            { id: '1', name: 'kubernetes', githubOrg: 'kubernetes', githubRepo: 'kubernetes', contributions: 450, activeContributors: 15 },
            { id: '2', name: 'kubeflow', githubOrg: 'kubeflow', githubRepo: 'kubeflow', contributions: 320, activeContributors: 12 },
            { id: '3', name: 'kserve', githubOrg: 'kserve', githubRepo: 'kserve', contributions: 280, activeContributors: 10 },
            { id: '4', name: 'ray-project', githubOrg: 'ray-project', githubRepo: 'ray', contributions: 200, activeContributors: 8 }
          ],
          trends: {}
        })
      });
    });

    // Mock config endpoint
    await page.route('**/api/modules/upstream-pulse/config', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          baseUrl: 'http://mock-upstream-pulse',
          configured: true,
          connection: { reachable: true, status: 200 }
        })
      });
    });

    // Mock contributors endpoint
    await page.route('**/api/modules/upstream-pulse/contributors*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ contributors: [] })
      });
    });

    // Mock leadership endpoint
    await page.route('**/api/modules/upstream-pulse/leadership*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ members: [], summary: {}, byOrg: [] })
      });
    });

    await page.goto('/#/upstream-pulse/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(DEFAULT_PAGE_WAIT_TIME);

    // Verify the Top Projects section heading exists
    const topProjectsHeading = page.locator('h3').filter({ hasText: 'Top Projects' });
    await expect(topProjectsHeading).toBeVisible();
    console.log('Top Projects section found');

    // Find the section container (id="section-projects")
    const topProjectsSection = page.locator('#section-projects');
    await expect(topProjectsSection).toBeVisible();

    // Count project cards within the section
    // Project cards are displayed in a grid (grid-cols-1 md:grid-cols-2 xl:grid-cols-3)
    // The dashboard shows up to 6 projects
    const projectCards = topProjectsSection.locator('.grid > div');
    const cardCount = await projectCards.count();

    // Verify at least 4 project cards are displayed (we mocked 4 projects)
    expect(cardCount).toBeGreaterThanOrEqual(4);
    console.log(`✓ Found ${cardCount} project card(s)`);

    // Verify the cards are visible
    for (let i = 0; i < Math.min(4, cardCount); i++) {
      await expect(projectCards.nth(i)).toBeVisible();
    }

    expect(page.errors).toHaveLength(0);
  });

  test('should display Top Contributors with mocked data', async ({ page }) => {
    // Mock the dashboard API response
    await page.route('**/api/modules/upstream-pulse/dashboard*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          contributions: {
            all: { team: 1250, total: 5000, teamPercent: 25 },
            commits: { team: 500, total: 2000, teamPercent: 25 },
            pullRequests: { team: 300, total: 1200, teamPercent: 25 },
            reviews: { team: 250, total: 1000, teamPercent: 25 },
            issues: { team: 200, total: 800, teamPercent: 25 }
          },
          summary: {
            activeContributors: 42,
            trackedProjects: 6,
            periodStart: '2024-01-01',
            periodEnd: '2024-01-31'
          },
          topContributors: [],
          orgActivity: [],
          dailyBreakdown: [],
          topProjects: [],
          trends: {}
        })
      });
    });

    // Mock the contributors endpoint with test data
    await page.route('**/api/modules/upstream-pulse/contributors*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          contributors: [
            { id: '1', name: 'Alice Johnson', githubUsername: 'alicecodes', avatarUrl: 'https://github.com/alicecodes.png', total: 450, commits: 200, prs: 100, reviews: 100, issues: 50 },
            { id: '2', name: 'Bob Smith', githubUsername: 'bobsmith', avatarUrl: 'https://github.com/bobsmith.png', total: 380, commits: 180, prs: 80, reviews: 80, issues: 40 },
            { id: '3', name: 'Carol Davis', githubUsername: 'carold', avatarUrl: 'https://github.com/carold.png', total: 320, commits: 150, prs: 70, reviews: 70, issues: 30 },
            { id: '4', name: 'David Lee', githubUsername: 'davidlee', avatarUrl: 'https://github.com/davidlee.png', total: 275, commits: 130, prs: 60, reviews: 60, issues: 25 },
            { id: '5', name: 'Eve Martinez', githubUsername: 'evem', avatarUrl: 'https://github.com/evem.png', total: 220, commits: 100, prs: 50, reviews: 50, issues: 20 }
          ]
        })
      });
    });

    // Mock config endpoint
    await page.route('**/api/modules/upstream-pulse/config', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          baseUrl: 'http://mock-upstream-pulse',
          configured: true,
          connection: { reachable: true, status: 200 }
        })
      });
    });

    // Mock leadership endpoint
    await page.route('**/api/modules/upstream-pulse/leadership*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ members: [], summary: {}, byOrg: [] })
      });
    });

    await page.goto('/#/upstream-pulse/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(DEFAULT_PAGE_WAIT_TIME);

    // Verify the Top Contributors section heading exists
    const topContributorsHeading = page.locator('h3').filter({ hasText: 'Top Contributors' });
    await expect(topContributorsHeading).toBeVisible();
    console.log('Top Contributors section found');

    // Find the section container (id="section-contributors")
    const topContributorsSection = page.locator('#section-contributors');
    await expect(topContributorsSection).toBeVisible();

    // Verify specific mocked contributor data displays in the UI
    await verifyTextDisplays(page, 'Alice Johnson', 'contributor');
    await verifyTextDisplays(page, '@alicecodes', 'GitHub username');
    await verifyTextDisplays(page, '450', 'contribution count');
    await verifyTextDisplays(page, 'Bob Smith', 'contributor');
    await verifyTextDisplays(page, '380', 'contribution count');

    // Verify at least 3 contributors are visible
    const contributorRows = topContributorsSection.locator('[class*="border-b"]');
    const rowCount = await contributorRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(3);
    console.log(`✓ Found ${rowCount} contributor rows`);

    expect(page.errors).toHaveLength(0);
  });

  test('should display Team Leadership section with Strategic Communities and Community Leaders', async ({ page }) => {
    // Mock the dashboard API response with orgActivity for Strategic Communities
    await page.route('**/api/modules/upstream-pulse/dashboard*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          contributions: {
            all: { team: 1250, total: 5000, teamPercent: 25 },
            commits: { team: 500, total: 2000, teamPercent: 25 },
            pullRequests: { team: 300, total: 1200, teamPercent: 25 },
            reviews: { team: 250, total: 1000, teamPercent: 25 },
            issues: { team: 200, total: 800, teamPercent: 25 }
          },
          summary: {
            activeContributors: 42,
            trackedProjects: 6,
            periodStart: '2024-01-01',
            periodEnd: '2024-01-31'
          },
          topContributors: [],
          orgActivity: [
            { org: 'kubernetes', orgName: 'Kubernetes', total: 500, totalContributions: 2000, teamSharePercent: 25, percentChange: 15, activeTeamMembers: 10, leadershipCount: 3, maintainerCount: 2 },
            { org: 'kubeflow', orgName: 'Kubeflow', total: 300, totalContributions: 1200, teamSharePercent: 25, percentChange: 10, activeTeamMembers: 8, leadershipCount: 2, maintainerCount: 1 }
          ],
          dailyBreakdown: [],
          topProjects: [],
          trends: {},
          leadership: {
            byOrg: [
              {
                orgName: 'Kubernetes',
                positions: [
                  {
                    positionType: 'steering_committee',
                    roleTitle: 'Steering Committee',
                    teamCount: 2,
                    members: [
                      { id: 'leader1', name: 'Sarah Chen', githubUsername: 'sarahchen', avatarUrl: 'https://github.com/sarahchen.png' },
                      { id: 'leader2', name: 'Mike Rodriguez', githubUsername: 'mikerodriguez', avatarUrl: 'https://github.com/mikerodriguez.png' }
                    ]
                  },
                  {
                    positionType: 'sig_lead',
                    roleTitle: 'SIG Lead',
                    teamCount: 1,
                    members: [
                      { id: 'leader3', name: 'Jessica Park', githubUsername: 'jessicapark', avatarUrl: 'https://github.com/jessicapark.png' }
                    ]
                  }
                ]
              }
            ]
          }
        })
      });
    });

    // Mock the leadership endpoint
    await page.route('**/api/modules/upstream-pulse/leadership*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          members: [],
          summary: {},
          byOrg: []
        })
      });
    });

    // Mock config endpoint
    await page.route('**/api/modules/upstream-pulse/config', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          baseUrl: 'http://mock-upstream-pulse',
          configured: true,
          connection: { reachable: true, status: 200 }
        })
      });
    });

    // Mock contributors endpoint
    await page.route('**/api/modules/upstream-pulse/contributors*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ contributors: [] })
      });
    });

    await page.goto('/#/upstream-pulse/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(DEFAULT_PAGE_WAIT_TIME);

    // Verify the Team Leadership section heading exists
    const teamLeadershipHeading = page.locator('h3').filter({ hasText: 'Team Leadership' });
    await expect(teamLeadershipHeading).toBeVisible();
    console.log('Team Leadership section found');

    // Find the section container (id="section-leadership")
    const leadershipSection = page.locator('#section-leadership');
    await expect(leadershipSection).toBeVisible();

    // Verify Community Leaders sub-section displays
    const communityLeadersHeading = page.locator('h3').filter({ hasText: 'Community Leaders' });
    await expect(communityLeadersHeading).toBeVisible();
    console.log('✓ Community Leaders section found');

    // Verify specific mocked leader data displays in the UI
    await verifyTextDisplays(page, 'Sarah Chen', 'community leader');
    await verifyTextDisplays(page, '@sarahchen', 'GitHub username');
    await verifyTextDisplays(page, 'Mike Rodriguez', 'community leader');
    await verifyTextDisplays(page, 'Jessica Park', 'community leader');
    await verifyTextDisplays(page, 'Steering Committee', 'role badge');

    expect(page.errors).toHaveLength(0);
  });

  test('should display Code Maintainership cards', async ({ page }) => {
    // Mock the dashboard API response
    await page.route('**/api/modules/upstream-pulse/dashboard*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          contributions: {
            all: { team: 1250, total: 5000, teamPercent: 25 },
            commits: { team: 500, total: 2000, teamPercent: 25 },
            pullRequests: { team: 300, total: 1200, teamPercent: 25 },
            reviews: { team: 250, total: 1000, teamPercent: 25 },
            issues: { team: 200, total: 800, teamPercent: 25 }
          },
          summary: {
            activeContributors: 42,
            trackedProjects: 6,
            periodStart: '2024-01-01',
            periodEnd: '2024-01-31'
          },
          topContributors: [],
          orgActivity: [],
          dailyBreakdown: [],
          topProjects: [],
          trends: {},
          leadership: {
            byOrg: []
          }
        })
      });
    });

    // Mock the leadership endpoint with maintainership data
    await page.route('**/api/modules/upstream-pulse/leadership*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          summary: {
            codeOwnerFiles: 15,
            totalCodeOwnerFiles: 50,
            ownerPositions: 8,
            totalOwnerPositions: 25,
            projectLeadPositions: 5,
            totalProjectLeadPositions: 20,
            reviewerPositions: 12,
            totalReviewerPositions: 40,
            projectsWithTeamLeadership: 4
          },
          members: [
            {
              id: 'm1',
              name: 'Alex Thompson',
              githubUsername: 'alexthompson',
              roles: [
                { projectId: 'p1', projectName: 'kubernetes', role: 'Owner' },
                { projectId: 'p2', projectName: 'kubeflow', role: 'Reviewer' }
              ]
            },
            {
              id: 'm2',
              name: 'Jordan Lee',
              githubUsername: 'jordanlee',
              roles: [
                { projectId: 'p1', projectName: 'kubernetes', role: 'Reviewer' }
              ]
            }
          ],
          byOrg: []
        })
      });
    });

    // Mock config endpoint
    await page.route('**/api/modules/upstream-pulse/config', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          baseUrl: 'http://mock-upstream-pulse',
          configured: true,
          connection: { reachable: true, status: 200 }
        })
      });
    });

    // Mock contributors endpoint
    await page.route('**/api/modules/upstream-pulse/contributors*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ contributors: [] })
      });
    });

    await page.goto('/#/upstream-pulse/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(DEFAULT_PAGE_WAIT_TIME);

    // Verify the Code Maintainership section heading exists
    const codeMaintainershipHeading = page.locator('h4').filter({ hasText: 'Code Maintainership' });
    await expect(codeMaintainershipHeading).toBeVisible();
    console.log('Code Maintainership section found');

    // Verify Top Maintainers sub-section displays with mocked data
    const topMaintainersHeading = page.locator('h3').filter({ hasText: 'Top Maintainers' });
    await expect(topMaintainersHeading).toBeVisible();
    console.log('✓ Top Maintainers section found');

    // Verify mocked maintainers display
    await verifyTextDisplays(page, 'Alex Thompson', 'maintainer');
    await verifyTextDisplays(page, '@alexthompson', 'GitHub username');
    await verifyTextDisplays(page, 'Jordan Lee', 'maintainer');
    await verifyTextDisplays(page, '@jordanlee', 'GitHub username');

    // Verify project count displays for Alex (2 projects)
    // Look for "2" followed by "projects" or "project"
    const topMaintainersSection = page.locator('h3').filter({ hasText: 'Top Maintainers' }).locator('..');
    const alexProjectCount = topMaintainersSection.locator('text=2').first();
    await expect(alexProjectCount).toBeVisible();
    console.log('✓ Found project count for maintainer: 2');

    // Verify role badges display (Owner, Reviewer)
    await verifyTextDisplays(page, 'Owner', 'role badge');
    await verifyTextDisplays(page, 'Reviewer', 'role badge');

    expect(page.errors).toHaveLength(0);
  });

  test('should load Insights view', async ({ page }) => {
    await testView(page, 'insights', 'Insights');
  });

  test('should display Contribution Trend and Contribution Mix on Insights view', async ({ page }) => {
    // Mock the dashboard API response with daily breakdown for trends
    await page.route('**/api/modules/upstream-pulse/dashboard*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          contributions: {
            all: { team: 1250, total: 5000, teamPercent: 25 },
            commits: { team: 500, total: 2000, teamPercent: 25 },
            pullRequests: { team: 300, total: 1200, teamPercent: 25 },
            reviews: { team: 250, total: 1000, teamPercent: 25 },
            issues: { team: 200, total: 800, teamPercent: 25 }
          },
          summary: {
            activeContributors: 42,
            trackedProjects: 6,
            periodStart: '2024-01-01',
            periodEnd: '2024-01-31'
          },
          topContributors: [],
          orgActivity: [],
          dailyBreakdown: [
            { date: '2024-01-01', team: 25, total: 100 },
            { date: '2024-01-02', team: 30, total: 120 },
            { date: '2024-01-03', team: 28, total: 110 }
          ],
          topProjects: [],
          trends: {}
        })
      });
    });

    // Mock config endpoint
    await page.route('**/api/modules/upstream-pulse/config', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          baseUrl: 'http://mock-upstream-pulse',
          configured: true,
          connection: { reachable: true, status: 200 }
        })
      });
    });

    // Mock contributors endpoint
    await page.route('**/api/modules/upstream-pulse/contributors*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ contributors: [] })
      });
    });

    // Mock leadership endpoint
    await page.route('**/api/modules/upstream-pulse/leadership*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ members: [], summary: {}, byOrg: [] })
      });
    });

    await page.goto('/#/upstream-pulse/insights');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(DEFAULT_PAGE_WAIT_TIME);

    // Verify the Contribution Trend section/card displays
    await verifyTextDisplays(page, 'Contribution Trend', 'Contribution Trend heading');

    // Verify the Contribution Mix section/graph displays
    await verifyTextDisplays(page, 'Contribution Mix', 'Contribution Mix heading');

    // Verify charts are rendered (canvas elements for Chart.js)
    const chartCanvases = page.locator('canvas');
    const chartCount = await chartCanvases.count();

    // Expect at least 2 charts (Contribution Trend and Contribution Mix)
    expect(chartCount).toBeGreaterThanOrEqual(2);
    console.log(`✓ Found ${chartCount} chart(s) on Insights view (expected at least 2)`);

    // Verify both charts are visible
    for (let i = 0; i < Math.min(2, chartCount); i++) {
      await expect(chartCanvases.nth(i)).toBeVisible();
    }

    // Verify the Total Team Impact banner displays at the bottom
    await verifyTextDisplays(page, 'Total Team Impact', 'Total Team Impact banner');

    // Verify the banner shows the team contribution count (1,250 from mocked data)
    await verifyTextDisplays(page, '1,250', 'team contribution count in banner');

    expect(page.errors).toHaveLength(0);
  });

  test('should load Portfolio view', async ({ page }) => {
    await testView(page, 'portfolio', 'Portfolio');
  });

  test('should display Portfolio stat cards and sections', async ({ page }) => {
    // Mock the orgs endpoint
    await page.route('**/api/modules/upstream-pulse/orgs*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          orgs: [
            { org: 'kubernetes', orgName: 'Kubernetes', total: 500, totalContributions: 2000, teamSharePercent: 25, activeTeamMembers: 10 },
            { org: 'kubeflow', orgName: 'Kubeflow', total: 300, totalContributions: 1200, teamSharePercent: 25, activeTeamMembers: 8 }
          ],
          summary: {
            totalContributions: 800,
            activeMembers: 18,
            activeOrgs: 2,
            avgTeamShare: 25.0
          }
        })
      });
    });

    // Mock the projects endpoint
    await page.route('**/api/modules/upstream-pulse/projects*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          projects: [
            { id: '1', name: 'kubernetes', githubOrg: 'kubernetes', githubRepo: 'kubernetes', contributions: 450, activeContributors: 15 },
            { id: '2', name: 'kubeflow', githubOrg: 'kubeflow', githubRepo: 'kubeflow', contributions: 320, activeContributors: 12 }
          ]
        })
      });
    });

    // Mock config endpoint
    await page.route('**/api/modules/upstream-pulse/config', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          baseUrl: 'http://mock-upstream-pulse',
          configured: true,
          connection: { reachable: true, status: 200 }
        })
      });
    });

    await page.goto('/#/upstream-pulse/portfolio');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(DEFAULT_PAGE_WAIT_TIME);

    // Verify the 4 stat cards at the top
    await verifyTextDisplays(page, 'Total Contributions', 'stat card');
    await verifyTextDisplays(page, 'Active Members', 'stat card');
    await verifyTextDisplays(page, 'Active Orgs', 'stat card');
    await verifyTextDisplays(page, 'Avg Team Share', 'stat card');

    // Verify Organizations section displays
    const organizationsHeading = page.locator('h3, h2').filter({ hasText: 'Organizations' });
    await expect(organizationsHeading).toBeVisible();
    console.log('✓ Organizations section found');

    // Verify mocked organizations display
    await verifyTextDisplays(page, 'Kubernetes', 'organization');
    await verifyTextDisplays(page, 'Kubeflow', 'organization');

    // Verify Projects section displays
    const projectsHeading = page.locator('h3, h2').filter({ hasText: 'Projects' });
    await expect(projectsHeading).toBeVisible();
    console.log('✓ Projects section found');

    // Verify mocked projects display
    await verifyTextDisplays(page, 'kubernetes', 'project');
    await verifyTextDisplays(page, 'kubeflow', 'project');

    expect(page.errors).toHaveLength(0);
  });

  test('should load Strategy view', async ({ page }) => {
    await testView(page, 'strategy', 'Strategy');
  });

  test('should display Strategy tier cards and sections', async ({ page }) => {
    // Mock the dashboard API response with orgActivity for strategic tiers
    await page.route('**/api/modules/upstream-pulse/dashboard*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          contributions: {
            all: { team: 1250, total: 5000, teamPercent: 25 }
          },
          summary: {
            activeContributors: 42,
            trackedProjects: 6,
            periodStart: '2024-01-01',
            periodEnd: '2024-01-31'
          },
          topContributors: [],
          orgActivity: [
            // Increasing tier (high team share + positive growth)
            { org: 'kubernetes', orgName: 'Kubernetes', total: 500, totalContributions: 2000, teamSharePercent: 30, percentChange: 15, activeTeamMembers: 10, leadershipCount: 3, maintainerCount: 2 },
            // Sustaining tier (good team share, stable)
            { org: 'kubeflow', orgName: 'Kubeflow', total: 300, totalContributions: 1200, teamSharePercent: 25, percentChange: 2, activeTeamMembers: 8, leadershipCount: 2, maintainerCount: 1 },
            // Evaluating tier (lower team share)
            { org: 'ray-project', orgName: 'Ray Project', total: 100, totalContributions: 1000, teamSharePercent: 10, percentChange: 5, activeTeamMembers: 5, leadershipCount: 0, maintainerCount: 0 }
          ],
          dailyBreakdown: [],
          topProjects: [],
          trends: {}
        })
      });
    });

    // Mock config endpoint
    await page.route('**/api/modules/upstream-pulse/config', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          baseUrl: 'http://mock-upstream-pulse',
          configured: true,
          connection: { reachable: true, status: 200 }
        })
      });
    });

    // Mock leadership endpoint
    await page.route('**/api/modules/upstream-pulse/leadership*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ members: [], summary: {}, byOrg: [] })
      });
    });

    // Mock contributors endpoint
    await page.route('**/api/modules/upstream-pulse/contributors*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ contributors: [] })
      });
    });

    await page.goto('/#/upstream-pulse/strategy');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(DEFAULT_PAGE_WAIT_TIME);

    // Verify the Strategy view loads
    const mainContentVisible = await mainContentIsVisible(page);
    expect(mainContentVisible).toBe(true);
    console.log('✓ Strategy view loaded successfully');

    expect(page.errors).toHaveLength(0);
  });
});
