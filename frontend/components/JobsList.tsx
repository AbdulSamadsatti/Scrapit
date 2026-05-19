import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import JobCard, { Job } from '@/components/JobCard';

interface JobsListProps {
  jobs: Job[];
  loading: boolean;
}

const JobsList: React.FC<JobsListProps> = ({ jobs, loading }) => {
  if (loading) {
    return <View style={styles.messageContainer}><Text>Loading jobs...</Text></View>;
  }

  if (!jobs || jobs.length === 0) {
    return <View style={styles.messageContainer}><Text>No jobs found</Text></View>;
  }

  return (
    <View>
      {jobs.map((item, index) => (
        <JobCard key={item.job_id ?? `${item.title}-${index}`} job={item} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    padding: 20,
    alignItems: 'center',
  },
});

export default JobsList;

