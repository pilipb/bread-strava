import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { BreadPost } from '../types';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme';

interface ActivityGraphProps {
  posts: BreadPost[];
}

interface DayData {
  date: string;
  dayName: string;
  totalTime: number;
}

const ActivityGraph: React.FC<ActivityGraphProps> = ({ posts }) => {
  const screenWidth = Dimensions.get('window').width;
  
  // Process posts to create data for the last 7 days
  const processActivityData = (): DayData[] => {
    const today = new Date();
    const last7Days: DayData[] = [];
    
    // Create array of last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      last7Days.push({
        date: date.toISOString().split('T')[0], // YYYY-MM-DD format
        dayName: date.toLocaleDateString('en', { weekday: 'short' }),
        totalTime: 0
      });
    }
    
    // Calculate total baking time for each day
    posts.forEach(post => {
      const postDate = new Date(post.createdAt).toISOString().split('T')[0];
      const dayData = last7Days.find(day => day.date === postDate);
      
      if (dayData) {
        const preparationTime = post.preparationTime || 0;
        const cookingTime = post.cookingTime || 0;
        dayData.totalTime += preparationTime + cookingTime;
      }
    });
    
    return last7Days;
  };

  const weekData = processActivityData();
  const maxTime = Math.max(...weekData.map(day => day.totalTime), 60); // Minimum 60 minutes for better visualization
  
  // Calculate total baking time for the week
  const totalWeekTime = weekData.reduce((sum, day) => sum + day.totalTime, 0);
  const averageTime = totalWeekTime / 7;
  
  const chartConfig = {
    backgroundGradientFrom: COLORS.card,
    backgroundGradientTo: COLORS.card,
    color: (opacity = 1) => `rgba(230, 126, 34, ${opacity})`, // Orange color
    strokeWidth: 3,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: COLORS.primary,
      fill: COLORS.background
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      stroke: COLORS.border,
      strokeWidth: 1
    },
    propsForLabels: {
      fontSize: 12,
      fill: COLORS.text
    }
  };

  const data = {
    labels: weekData.map(day => day.dayName),
    datasets: [
      {
        data: weekData.map(day => day.totalTime),
        color: (opacity = 1) => `rgba(230, 126, 34, ${opacity})`,
        strokeWidth: 3
      }
    ]
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Baking Activity</Text>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{Math.round(totalWeekTime)}m</Text>
            <Text style={styles.statLabel}>Total This Week</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{Math.round(averageTime)}m</Text>
            <Text style={styles.statLabel}>Daily Average</Text>
          </View>
        </View>
      </View>
      
      {totalWeekTime > 0 ? (
        <LineChart
          data={data}
          width={screenWidth - SPACING.md * 2}
          height={180}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          yAxisSuffix="m"
          fromZero={true}
          withInnerLines={true}
          withOuterLines={false}
          withVerticalLines={false}
          withHorizontalLines={true}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No baking activity this week</Text>
          <Text style={styles.emptySubtext}>Start baking and track your progress!</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.darkGray,
    marginTop: SPACING.xs / 2,
  },
  chart: {
    marginVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyText: {
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
    color: COLORS.darkGray,
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.darkGray,
    textAlign: 'center',
  },
  note: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.darkGray,
    textAlign: 'center',
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
});

export default ActivityGraph; 