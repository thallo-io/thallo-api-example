import axios, { AxiosInstance } from 'axios'
import { BigNumber } from 'ethers'

// set up endpoint and api key
const baseUrl = 'https://${BASE_URL}'
const apiKey = '${API_KEY}'

// do not run this example against production
if (baseUrl.toLowerCase().includes('thallo.io')) {
    throw new Error(`Do not run this example against the production environment as it could cause purchases to be made which are final and you will be invoiced for them at the end of the month. Baseurl: ${baseUrl}`)
}

const httpClient: AxiosInstance = axios.create({
    baseURL: baseUrl,
    headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
    },
})

async function run() {
    // get market data
    const marketData = (await httpClient.get('/api/market')).data
    // get project ids so we can get the project details
    const projectIds = marketData.projects.map((project: { project_id: string }) => project.project_id)

    // you should cache the project data as it doesn't change often
    const projects = (await httpClient.get('/api/projects', {
        params: { project_ids: projectIds }
    })).data.projects

    // select project from Sierra Leone - you can filter on whatever you like here
    const selectedProject = projects.filter((project: { location: string }) => project.location === 'SL')[0]
    
    // get sell order for this project
    const vintage = marketData.projects.filter((project: { project_id: string }) => project.project_id === selectedProject.project_id)[0]
        .vintages[0]
    const sellOrder = vintage.sell_orders[0]

    // ensure the price is less than the max you're comfortable paying e.g. $10.45 per carbon credit (1 tonne)
    if (BigNumber.from(sellOrder.price_cents).gt(1045)) {
        throw new Error('Sell order price too high')
    }

    // request retirement
    const retirementRequestId = (await httpClient.post('api/caas/request-retirement', {
        quantity_grams: '20',
        vintage_id: vintage.vintage_id,
        sell_order_id: sellOrder.sell_order_id,
        expected_price_cents: sellOrder.price_cents,
        /* This retiree id is provided by user which is making request.
         This may be used in future Thallo features for analytics. DO NOT use any PII in this field.
         This should be a randomly generate alphanumeric as shown below */
        external_retiree_id: "7eece928-5a7a-4591-800a-4859635e4037",
        /* Unique external id which can be used only once and must be unique in every single request 
         for idempotency purposes. This should be a randomly generate alphanumeric as shown below */
        external_id: "a114f6ba-d7e4-40ad-aae2-8630bc2a7379",
    })).data.retirement_request_id

    console.log(`retirementRequestId: ${retirementRequestId}`)
}

run()
