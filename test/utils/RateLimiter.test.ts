import {beforeEach, describe, expect, it} from '@jest/globals';
import {RateLimiter} from "../../src/utils/RateLimiter";

describe('RateLimiter', () => {

    let rateLimiter: RateLimiter;

    beforeEach(() => {
        rateLimiter = new RateLimiter(15, 1000);
    });

    it('Rate limiter should execute 5 requests immediately', () => {
        const startTime = Date.now();

        const rateLimitedRequestPromises = [];
        for (let i = 0; i < 15; i++) {
            rateLimitedRequestPromises.push(rateLimiter.returnRateLimitedPromise(() => Promise.resolve(Date.now())));
        }

        return Promise.all(rateLimitedRequestPromises).then((endTimes) => {
            endTimes.forEach((endTime) => expect(endTime - startTime).toBeLessThanOrEqual(100))
        })
    });

    it('Rate limiter should execute 5 requests immediately, then the next 3 requests after 1 second.', () => {
        const startTime = Date.now();

        const rateLimitedRequestPromises = [];
        for (let i = 0; i < 18; i++) {
            rateLimitedRequestPromises.push(rateLimiter.returnRateLimitedPromise(() => Promise.resolve(Date.now())));
        }

        return Promise.all(rateLimitedRequestPromises).then((endTimes: number[]) => {
            for (let i = 0; i < endTimes.length; i++) {
                const endTime: number = endTimes[i] as number;

                (i < 15)
                    ? expect(endTime - startTime).toBeLessThanOrEqual(100)
                    : expect(endTime - startTime).toBeGreaterThanOrEqual(1000);
            }
        })
    });

    it('Rate limiter should execute 50 requests rate limited at 15 requests per second.', () => {
        rateLimiter = new RateLimiter(15, 1000);
        const startTime = Date.now();

        const rateLimitedRequestPromises = [];
        for (let i = 0; i < 50; i++)
            rateLimitedRequestPromises.push(rateLimiter.returnRateLimitedPromise(() => Promise.resolve(Date.now())));

        return Promise.all(rateLimitedRequestPromises).then(endTimes => {
            for (let i = 0; i < endTimes.length; i++) {
                expect(endTimes[i]! - startTime).toBeGreaterThanOrEqual(Math.floor(i / 15) * 1000);
            }
        })
    });
});