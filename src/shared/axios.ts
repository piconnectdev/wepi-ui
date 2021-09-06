import axios from 'axios'
#export const DEV_URL = `https://wepi.social/api/v3`
export const DEV_URL = `http://localhost:8536/api/v3`
export const PROD_URL = 'https://wepi.social/api/v3'
const isDev = process.env.NODE_ENV === 'development'

export default axios.create({
    baseURL: isDev ? DEV_URL : PROD_URL
})
