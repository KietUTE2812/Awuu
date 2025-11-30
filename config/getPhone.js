const request = require("request");
const dotenv = require("dotenv");
dotenv.config();

const endpoint = "https://graph.zalo.me/v2.0/me/info";
const secretKey = process.env.ZALO_SECRET;

const getPhone = async ({userAccessToken, token}) => {
    const options = {
        url: endpoint,
        headers: {
            access_token: userAccessToken,
            code: token,
            secret_key: secretKey,
        }
    };
    return new Promise((resolve, reject) => {
        request.get(options, (error, response, body) => {
            if (error) {
                return reject(error);
            }
            try {
                const data = JSON.parse(body);
                console.log("Zalo API response for phone number:", data);
                if (data.error) {
                    console.error("Error fetching phone number:", data.error);
                    return reject(data.error);
                }
                return resolve(data.number);
            } catch (parseError) {
                return reject(parseError);
            }
        });
    });
};

module.exports = getPhone;