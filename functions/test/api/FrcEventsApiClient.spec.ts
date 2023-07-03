import { readFile } from 'fs/promises';
import FrcEventsApiClient from '../../src/api/FrcEventsApiClient';

describe('FrcEventsApiClient', () => {
  let client: FrcEventsApiClient;
  beforeEach(() => {
    client = new FrcEventsApiClient('user:pass', 'https://frc.test');
  });

  it('Sets up base client', () => {
    expect(Reflect.get(client, 'apiBaseUrl')).toEqual('https://frc.test');
    expect(Reflect.get(client, 'headers')).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Basic dXNlcjpwYXNz',
    });
  });

  it('gets current qual match', async () => {
    const getSpy = jest.spyOn(client as any, 'get');
    getSpy.mockImplementation(async () => {
      const fileContent = await readFile('../../test_data/FrcApi/2023-MIKET-QualMatches.json');
      return JSON.parse(fileContent.toString());
    });
    const currentQualMatch = await client.getCurrentQualMatch('EVENT', 9999);

    expect(currentQualMatch).toEqual('8');

    expect(getSpy).toBeCalledTimes(1);
    expect(getSpy).toBeCalledWith('/9999/matches/EVENT?tournamentLevel=qual&start=1', 'EVENT');
  });

  it('gets current qual match with a last known', async () => {
    const getSpy = jest.spyOn(client as any, 'get');
    getSpy.mockImplementation(async () => {
      const fileContent = await readFile('../../test_data/FrcApi/2023-MIKET-QualMatches.json');
      return JSON.parse(fileContent.toString());
    });

    await client.getCurrentQualMatch('EVENT', 9999, 6);

    expect(getSpy).toBeCalledTimes(1);
    expect(getSpy).toBeCalledWith('/9999/matches/EVENT?tournamentLevel=qual&start=6', 'EVENT');
  });
});
