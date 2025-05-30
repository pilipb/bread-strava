import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchPostById, editPost } from '../store/postsSlice';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme';

type EditPostScreenNavigationProp = StackNavigationProp<RootStackParamList, 'EditPost'>;
type EditPostScreenRouteProp = RouteProp<RootStackParamList, 'EditPost'>;

interface Props {
  navigation: EditPostScreenNavigationProp;
  route: EditPostScreenRouteProp;
}

const difficultyLevels = ['easy', 'medium', 'hard', 'expert'] as const;

const EditPostScreen: React.FC<Props> = ({ navigation, route }) => {
  const { postId } = route.params;
  const dispatch = useAppDispatch();
  const { currentPost, loading } = useAppSelector((state) => state.posts);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('medium');
  const [ingredients, setIngredients] = useState<string[]>(['']);
  const [preparationTime, setPreparationTime] = useState('');
  const [cookingTime, setCookingTime] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const loadPost = async () => {
      if (!currentPost || currentPost.id !== postId) {
        await dispatch(fetchPostById(postId));
      } else {
        populateForm(currentPost);
        setInitialLoading(false);
      }
    };

    loadPost();
  }, [dispatch, postId, currentPost]);

  useEffect(() => {
    if (currentPost && currentPost.id === postId && initialLoading) {
      populateForm(currentPost);
      setInitialLoading(false);
    }
  }, [currentPost, postId, initialLoading]);

  const populateForm = (post: typeof currentPost) => {
    if (!post) return;
    
    setTitle(post.title);
    setDescription(post.description);
    setDifficulty(post.difficulty);
    setIngredients(post.ingredients && post.ingredients.length > 0 ? post.ingredients : ['']);
    setPreparationTime(post.preparationTime ? post.preparationTime.toString() : '');
    setCookingTime(post.cookingTime ? post.cookingTime.toString() : '');
  };

  const handleAddIngredient = () => {
    setIngredients([...ingredients, '']);
  };

  const handleUpdateIngredient = (text: string, index: number) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = text;
    setIngredients(newIngredients);
  };

  const handleRemoveIngredient = (index: number) => {
    if (ingredients.length > 1) {
      const newIngredients = [...ingredients];
      newIngredients.splice(index, 1);
      setIngredients(newIngredients);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Information', 'Please add a title for your bread post.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Missing Information', 'Please add a description for your bread post.');
      return;
    }

    const filteredIngredients = ingredients.filter((ingredient) => ingredient.trim() !== '');

    try {
      await dispatch(
        editPost({
          postId,
          data: {
            title: title.trim(),
            description: description.trim(),
            difficulty,
            ingredients: filteredIngredients,
            preparationTime: preparationTime ? parseInt(preparationTime, 10) : undefined,
            cookingTime: cookingTime ? parseInt(cookingTime, 10) : undefined,
          },
        })
      ).unwrap();

      navigation.goBack();
    } catch (error) {
      // Error handled in the slice
    }
  };

  if (initialLoading || !currentPost) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loaderText}>Loading post data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Edit Your Bread Post</Text>

      <View style={styles.imageContainer}>
        <Image source={{ uri: currentPost.photoURL }} style={styles.previewImage} />
        <Text style={styles.imageNote}>Image cannot be changed</Text>
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="What type of bread did you bake?"
          placeholderTextColor={COLORS.mediumGray}
          maxLength={50}
        />
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Share your baking experience, recipe tips, or anything special about this bread!"
          placeholderTextColor={COLORS.mediumGray}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Difficulty</Text>
        <View style={styles.difficultyContainer}>
          {difficultyLevels.map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.difficultyOption,
                difficulty === level && styles.difficultySelected,
              ]}
              onPress={() => setDifficulty(level)}
            >
              <Text
                style={[
                  styles.difficultyText,
                  difficulty === level && styles.difficultyTextSelected,
                ]}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Ingredients</Text>
        {ingredients.map((ingredient, index) => (
          <View key={index} style={styles.ingredientRow}>
            <TextInput
              style={[styles.input, styles.ingredientInput]}
              value={ingredient}
              onChangeText={(text) => handleUpdateIngredient(text, index)}
              placeholder={`Ingredient ${index + 1}`}
              placeholderTextColor={COLORS.mediumGray}
            />
            
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveIngredient(index)}
              disabled={ingredients.length === 1}
            >
              <Text style={styles.removeButtonText}>-</Text>
            </TouchableOpacity>
          </View>
        ))}
        
        <TouchableOpacity style={styles.addButton} onPress={handleAddIngredient}>
          <Text style={styles.addButtonText}>+ Add Ingredient</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.timeContainer}>
        <View style={[styles.formGroup, styles.halfWidth]}>
          <Text style={styles.label}>Prep Time (min)</Text>
          <TextInput
            style={styles.input}
            value={preparationTime}
            onChangeText={setPreparationTime}
            placeholder="60"
            placeholderTextColor={COLORS.mediumGray}
            keyboardType="numeric"
          />
        </View>
        
        <View style={[styles.formGroup, styles.halfWidth]}>
          <Text style={styles.label}>Baking Time (min)</Text>
          <TextInput
            style={styles.input}
            value={cookingTime}
            onChangeText={setCookingTime}
            placeholder="45"
            placeholderTextColor={COLORS.mediumGray}
            keyboardType="numeric"
          />
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.background} />
        ) : (
          <Text style={styles.submitButtonText}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: SPACING.md,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.darkGray,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  imageContainer: {
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
  },
  imageNote: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.darkGray,
    fontStyle: 'italic',
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.lightGray,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    fontSize: FONT_SIZE.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: 100,
  },
  difficultyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  difficultyOption: {
    flex: 1,
    padding: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    marginHorizontal: 2,
  },
  difficultySelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  difficultyText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
  },
  difficultyTextSelected: {
    color: COLORS.background,
    fontWeight: 'bold',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  ingredientInput: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: COLORS.background,
    fontSize: FONT_SIZE.lg,
    fontWeight: 'bold',
  },
  addButton: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  addButtonText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  submitButtonText: {
    color: COLORS.background,
    fontSize: FONT_SIZE.md,
    fontWeight: 'bold',
  },
});

export default EditPostScreen; 