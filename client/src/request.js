import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from 'apollo-boost';
import gql from 'graphql-tag';
import { getAccessToken, isLoggedIn } from './auth';

const endpointUrl = 'http://localhost:9000/graphql';

const authLink = new ApolloLink((operation, forward) => {
  if (isLoggedIn()) {
    operation.setContext({
      headers: {
        'authorization': `Bearer ${getAccessToken()}`
      }
    })
  }
  return forward(operation);
})

const client = new ApolloClient({
  link: ApolloLink.from([
    authLink,
    new HttpLink({ uri: endpointUrl })
  ]),
  cache: new InMemoryCache()
});

// const gqlRequest = async (query, variables) => {
//   const request = {
//     method: 'POST',
//     headers: { 'content-type': 'application/json' },
//     body: JSON.stringify({
//       query,
//       variables
//     })
//   }

//   if (isLoggedIn()) {
//     request.headers['authorization'] = `Bearer ${getAccessToken()}`;
//   }
//   const res = await fetch(endpointUrl, request);

//   const resBody = await res.json();
//   if (resBody.errors) {
//     const message = resBody.errors.map(err => err.message).join('\n');
//     throw new Error(message);
//   }
//   return resBody.data;
// }

const jobDetailFragment = gql`
  fragment JobDetail on Job {
    id
    title
    description
    company {
      id
      name
    }
  }
`;


const jobsQuery = gql`
  query JobsQuery {
    jobs {
      id
      title
      description
      company {
        id
        name
      }
    }
  }
`;

const jobQuery = gql`
  query JobQuery($id: ID!){
    job(id: $id){
      ...JobDetail
    }
  }
  ${jobDetailFragment}
`;

const createJobMutation = gql`
  mutation CreateJob($input: CreateJobInput) {
    job: createJob(input: $input) {
      ...JobDetail
    }
  }
  ${jobDetailFragment}
`;


const companyQuery = gql`
  query CompanyQuery($id: ID!){
    company(id: $id){
      id
      name
      description
      jobs {
        id
        title
      }
    }
  }
`;

export const loadJobs = async () => {
  const { data: { jobs } } = await client.query({ query: jobsQuery, fetchPolicy: 'no-cache' });
  return jobs;
}

export const loadJobDetail = async (id) => {
  const { data: { job } } = await client.query({ query: jobQuery, variables: { id } });
  return job;
}

export const loadCompanyDetail = async (id) => {
  const { data: { company } } = await client.query({ query: companyQuery, variables: { id } });
  return company;
}

export const createJob = async (input) => {
  const { data: { job } } = await client.mutate({
    mutation: createJobMutation,
    variables: { input },
    update: (cache, { data }) => {
      cache.writeQuery({
        query: jobQuery,
        variables: { id: data.job.id },
        data
      })
    }
  });
  return job;
}

