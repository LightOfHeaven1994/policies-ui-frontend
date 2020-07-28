import * as React from 'react';
import { render, screen } from '@testing-library/react';
import ListPage from '../ListPage';
import { appWrapperCleanup, appWrapperSetup, getConfiguredAppWrapper } from '../../../../test/AppWrapper';
import { waitForAsyncEvents } from '../../../../test/TestUtils';
import fetchMock  from 'fetch-mock';
import { actionGetPolicies } from '../../../generated/ActionCreators';
import { linkTo } from '../../../Routes';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

jest.mock('@redhat-cloud-services/insights-common-typescript', () => {
    const real = jest.requireActual('@redhat-cloud-services/insights-common-typescript');
    return {
        ...real,
        useUrlState: (p) => useState(p)
    };
});
jest.mock('../../../hooks/useFacts');
jest.mock('@redhat-cloud-services/frontend-components', () => {
    const MockedSkeletonTable = () => <div>Loading Policies</div>;

    return {
        ...jest.requireActual('@redhat-cloud-services/frontend-components'),
        SkeletonTable: MockedSkeletonTable
    };
});

describe('src/pages/ListPage', () => {

    beforeEach(() => {
        appWrapperSetup();
    });

    afterEach(() => {
        appWrapperCleanup();
    });

    const mockPolicies = [
        {
            actions: 'email',
            conditions: 'facts.arch = "x86_64"',
            ctime: '2020-06-02 16:11:09.622',
            description: 'Description for policy 1',
            id: 'foo',
            isEnabled: true,
            lastTriggered: 1591132435642,
            mtime: '2020-06-02 16:11:48.428',
            name: 'Policy 1'
        },
        {
            actions: 'email',
            conditions: 'facts.arch = "x86_64"',
            ctime: '2020-06-02 16:11:09.622',
            description: 'Description for policy 2',
            id: 'bar',
            isEnabled: true,
            lastTriggered: 1591132435642,
            mtime: '2020-06-02 16:11:48.428',
            name: 'Policy 2'
        },
        {
            actions: 'email',
            conditions: 'facts.arch = "x86_64"',
            ctime: '2020-06-02 16:11:09.622',
            description: 'Description for policy 3',
            id: 'baz',
            isEnabled: true,
            lastTriggered: 1591132435642,
            mtime: '2020-06-02 16:11:48.428',
            name: 'Policy 3'
        },
        {
            actions: 'email',
            conditions: 'facts.arch = "x86_64"',
            ctime: '2020-06-02 16:11:09.622',
            description: 'Description for policy 4',
            id: 'foobar',
            isEnabled: true,
            lastTriggered: 1591132435642,
            mtime: '2020-06-02 16:11:48.428',
            name: 'Policy 4'
        }
    ];

    type FetchMockSetupType = {
        status?: number;
        policies?: any;
        count?: number;
        emptyPayload?: boolean;
    };

    const fetchMockSetup = (config?: FetchMockSetupType) => {
        fetchMock.getOnce(actionGetPolicies({
            limit: 50,
            offset: 0
        }).endpoint, {
            status: config?.status || 200,
            body: config?.emptyPayload === true ? undefined : {
                meta: {
                    count: config?.count || 100
                },
                data: config?.policies || mockPolicies
            }
        }, {
            overwriteRoutes: true
        });
    };

    it('Refuses to show data if rbac.readAll is false', async () => {
        render(<ListPage/>, {
            wrapper: getConfiguredAppWrapper({
                router: {
                    initialEntries: [ linkTo.listPage() ]
                },
                route: {
                    path: linkTo.listPage()
                },
                appContext: {
                    rbac: {
                        canWriteAll: true,
                        canReadAll: false
                    },
                    userSettings: {
                        isSubscribedForNotifications: false,
                        refresh: () => '',
                        settings: undefined
                    }
                }
            })
        });

        await waitForAsyncEvents();
        expect(screen.getAllByText(/0 - 0/).length).toBeGreaterThan(0);
    });

    it('Has title "Policies"', async () => {
        fetchMockSetup();
        render(<ListPage/>, {
            wrapper: getConfiguredAppWrapper()
        });
        await waitForAsyncEvents();

        expect(screen.getByText('Policies', { selector: 'h1' })).toBeVisible();
    });

    it('Renders policies data"', async () => {
        fetchMockSetup();
        render(<ListPage/>, {
            wrapper: getConfiguredAppWrapper()
        });

        await waitForAsyncEvents();

        expect(screen.getByText('Policy 1')).toBeVisible();
        expect(screen.getByText('Policy 2')).toBeVisible();
        expect(screen.getByText('Policy 3')).toBeVisible();
        expect(screen.getByText('Policy 4')).toBeVisible();
    });

    it('Policy name is not a link in stable"', async () => {
        fetchMockSetup();
        const getLocation = jest.fn();
        render(<ListPage/>, {
            wrapper: getConfiguredAppWrapper({
                router: {
                    initialEntries: [
                        '/policies/list'
                    ]
                },
                getLocation
            })
        });

        await waitForAsyncEvents();
        userEvent.click(screen.getByText('Policy 1'));
        await waitForAsyncEvents();

        expect(getLocation().pathname).toEqual('/policies/list');
    });

    it('Policy name is a link in beta"', async () => {
        fetchMockSetup();
        const getLocation = jest.fn();
        render(<ListPage/>, {
            wrapper: getConfiguredAppWrapper({
                router: {
                    initialEntries: [
                        '/beta/policies/list'
                    ]
                },
                getLocation
            })
        });

        await waitForAsyncEvents();
        userEvent.click(screen.getByText('Policy 1'));
        await waitForAsyncEvents();

        expect(getLocation().pathname).not.toEqual('/policies/list');
    });

    it('Nothing is sorted by default ', async () => {
        fetchMockSetup();
        render(<ListPage/>, {
            wrapper: getConfiguredAppWrapper()
        });

        await waitForAsyncEvents();

        expect(screen.getByText(/name/i, {
            selector: 'th span'
        }).closest('th')).toHaveAttribute('aria-sort', 'none');
    });

    it('Shows empty state when no policy is found ', async () => {
        fetchMockSetup({
            status: 404,
            emptyPayload: true
        });
        render(<ListPage/>, {
            wrapper: getConfiguredAppWrapper()
        });

        await waitForAsyncEvents();
        expect(screen.getByText(/No Policies/i, {
            selector: 'h5'
        })).toBeVisible();
    });

    it('Shows reload required on 401', async () => {
        fetchMockSetup({
            status: 401,
            emptyPayload: true
        });
        render(<ListPage/>, {
            wrapper: getConfiguredAppWrapper()
        });

        await waitForAsyncEvents();
        expect(screen.getByText(/Refresh your browser/i, {
            selector: 'h5'
        })).toBeVisible();
    });

    it('Reloads browser when clicking on Reload page button', async () => {
        fetchMockSetup({
            status: 401,
            emptyPayload: true
        });
        const reloadMock = jest.spyOn(window.location, 'reload');
        reloadMock.mockImplementation(() => '');
        render(<ListPage/>, {
            wrapper: getConfiguredAppWrapper()
        });

        await waitForAsyncEvents();
        userEvent.click(screen.getByText('Reload page'));
        await waitForAsyncEvents();

        expect(reloadMock).toHaveBeenCalledTimes(1);
        reloadMock.mockRestore();
    });

    it('Shows internal server errors on status 500', async () => {
        fetchMockSetup({
            status: 500,
            emptyPayload: true
        });
        render(<ListPage/>, {
            wrapper: getConfiguredAppWrapper()
        });

        await waitForAsyncEvents();
        expect(screen.getByText(/Internal server error/i, {
            selector: 'h5'
        })).toBeVisible();
    });

    it('Shows Unable to connect on other error status', async () => {
        fetchMockSetup({
            status: 504,
            emptyPayload: true
        });
        render(<ListPage/>, {
            wrapper: getConfiguredAppWrapper()
        });

        await waitForAsyncEvents();
        expect(screen.getByText(/Unable to connect/i, {
            selector: 'h5'
        })).toBeVisible();
    });

    it('When clicking the retry button on the error status, it loads the query again', async () => {
        fetchMockSetup({
            status: 504,
            emptyPayload: true
        });
        render(<ListPage/>, {
            wrapper: getConfiguredAppWrapper()
        });

        await waitForAsyncEvents();
        fetchMockSetup();

        userEvent.click(screen.getByText('Try again'));

        await waitForAsyncEvents();
        expect(screen.getByText('Policy 1')).toBeVisible();
    });

    it('Clicking on the expanded button shows the description', async () => {
        fetchMockSetup();
        render(<ListPage/>, {
            wrapper: getConfiguredAppWrapper()
        });

        await waitForAsyncEvents();
        userEvent.click(screen.getAllByLabelText('Details')[0]);

        await waitForAsyncEvents();
        expect(screen.getByText('Description for policy 1')).toBeVisible();
    });

    it('Is possible to expand all policies at the same time', async () => {
        fetchMockSetup();
        render(<ListPage/>, {
            wrapper: getConfiguredAppWrapper()
        });

        await waitForAsyncEvents();
        screen.getAllByLabelText('Details').forEach((e => {
            userEvent.click(e);
        }));

        await waitForAsyncEvents();
        expect(screen.getByText('Description for policy 1')).toBeVisible();
        expect(screen.getByText('Description for policy 2')).toBeVisible();
        expect(screen.getByText('Description for policy 3')).toBeVisible();
        expect(screen.getByText('Description for policy 4')).toBeVisible();
    });

    it('Create policy button opens the create policy wizard', async () => {
        fetchMockSetup();
        render(<ListPage/>, {
            wrapper: getConfiguredAppWrapper()
        });

        await waitForAsyncEvents();
        userEvent.click(screen.getByText('Create policy'));

        await waitForAsyncEvents();
        expect(screen.getAllByText('Create a policy')).toBeTruthy();
    });

    it('Create policy wizard can be closed', async () => {
        fetchMockSetup();
        render(<ListPage/>, {
            wrapper: getConfiguredAppWrapper()
        });

        await waitForAsyncEvents();
        userEvent.click(screen.getByText('Create policy'));

        await waitForAsyncEvents();
        userEvent.click(screen.getByText('Cancel'));

        expect(screen.queryByText('Create a policy')).toBeFalsy();
    });
});