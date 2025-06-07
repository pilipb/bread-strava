import React, { useState } from 'react';
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
  FlatList,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { RootStackParamList, Location as LocationType } from '../types';
import { useAppDispatch, useAppSelector } from '../store';
import { addNewPost } from '../store/postsSlice';
import { createConnectedPost } from '../services/firebase';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme';

type CreatePostScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreatePost'>;
type CreatePostScreenRouteProp = RouteProp<RootStackParamList, 'CreatePost'>;

interface Props {
  navigation: CreatePostScreenNavigationProp;
  route: CreatePostScreenRouteProp;
}

const difficultyLevels = ['easy', 'medium', 'hard', 'expert'] as const;
const MAX_IMAGES = 5;

const CreatePostScreen: React.FC<Props> = ({ navigation, route }) => {
  const { 
    originalRecipeId,
    originalTitle,
    originalIngredients,
    originalDifficulty,
    originalPreparationTime,
    originalCookingTime,
  } = route.params || {};

  const [title, setTitle] = useState(originalTitle ? `My ${originalTitle}` : '');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>(originalDifficulty || 'medium');
  const [images, setImages] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<string[]>(originalIngredients || ['']);
  const [preparationTime, setPreparationTime] = useState(originalPreparationTime?.toString() || '');
  const [cookingTime, setCookingTime] = useState(originalCookingTime?.toString() || '');
  const [location, setLocation] = useState<LocationType | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [shareLocation, setShareLocation] = useState(true);

  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.posts);
  const { user } = useAppSelector((state) => state.auth);

  const getLocation = async () => {
    try {
      setLocationLoading(true);
      
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is needed to share where you baked this bread. This helps other bakers discover recipes from their area!'
        );
        setShareLocation(false);
        return;
      }

      // Get current location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Reverse geocode to get address
      const [address] = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      const locationData: LocationType = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        address: address?.name || undefined,
        city: address?.city || undefined,
        country: address?.country || undefined,
      };

      setLocation(locationData);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Location Error', 'Unable to get your current location. You can still post without location data.');
      setShareLocation(false);
    } finally {
      setLocationLoading(false);
    }
  };

  const pickImages = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('Maximum Images', `You can only add up to ${MAX_IMAGES} images per post.`);
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'You need to allow access to your photos to upload images.');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
      allowsEditing: false,
      quality: 0.8,
      base64: false,
    });
    
    if (!result.canceled) {
      const newImages = result.assets.map(asset => asset.uri);
      setImages(prevImages => [...prevImages, ...newImages].slice(0, MAX_IMAGES));
    }
  };

  const takePhoto = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert('Maximum Images', `You can only add up to ${MAX_IMAGES} images per post.`);
      return;
    }

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'You need to allow access to your camera to take a photo.');
      return;
    }
    
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    
    if (!result.canceled) {
      setImages(prevImages => [...prevImages, result.assets[0].uri].slice(0, MAX_IMAGES));
    }
  };

  const removeImage = (index: number) => {
    setImages(prevImages => prevImages.filter((_, i) => i !== index));
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

    if (images.length === 0) {
      Alert.alert('Missing Images', 'Please add at least one photo of your bread creation.');
      return;
    }

    // Get location if sharing location is enabled and we don't have it yet
    if (shareLocation && !location && !locationLoading) {
      await getLocation();
    }

    const filteredIngredients = ingredients.filter((ingredient) => ingredient.trim() !== '');

    try {
      if (!user) {
        Alert.alert('Error', 'You must be logged in to create a post.');
        return;
      }

      const postData = {
        userId: user.id,
        username: user.username,
        userPhotoURL: user.photoURL,
        title: title.trim(),
        description: description.trim(),
        photoURL: '', // Will be set by the createPost function
        difficulty,
        ingredients: filteredIngredients,
        preparationTime: preparationTime ? parseInt(preparationTime, 10) : undefined,
        cookingTime: cookingTime ? parseInt(cookingTime, 10) : undefined,
        location: shareLocation && location ? location : undefined,
        isOriginalRecipe: !originalRecipeId, // False if this is connected to an original recipe
        connectedPosts: [], // Initialize empty connected posts array
      };

      if (originalRecipeId) {
        // Create a connected post
        await createConnectedPost(postData, images, originalRecipeId);
      } else {
        // Create a regular post
        await dispatch(addNewPost({
          post: postData,
          images,
        })).unwrap();
      }

      navigation.goBack();
    } catch (error) {
      // Error handled in the slice
    }
  };

  const renderImageItem = ({ item, index }: { item: string; index: number }) => (
    <View style={styles.imageItem}>
      <Image source={{ uri: item }} style={styles.previewImage} />
      <TouchableOpacity 
        style={styles.removeImageButton}
        onPress={() => removeImage(index)}
      >
        <Text style={styles.removeImageText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>
        {originalRecipeId ? 'Share Your Version' : 'Share Your Bread Creation'}
      </Text>
      
      {originalRecipeId && (
        <View style={styles.connectedRecipeInfo}>
          <Text style={styles.connectedRecipeText}>
            🔗 Making a recipe you've tried? Share your version and it will be connected to the original!
          </Text>
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}
      
      <View style={styles.imageContainer}>
        {images.length > 0 ? (
          <>
            <FlatList
              data={images}
              renderItem={renderImageItem}
              keyExtractor={(item, index) => `image-${index}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.imagesList}
            />
            <Text style={styles.imageCountText}>
              {images.length} of {MAX_IMAGES} images
            </Text>
          </>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>Add Photos</Text>
            <Text style={styles.imagePlaceholderSubtext}>Up to {MAX_IMAGES} images</Text>
          </View>
        )}
        
        <View style={styles.imageButtonsContainer}>
          <TouchableOpacity 
            style={[styles.imageButton, images.length >= MAX_IMAGES && styles.disabledButton]} 
            onPress={pickImages}
            disabled={images.length >= MAX_IMAGES}
          >
            <Text style={styles.imageButtonText}>Gallery</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.imageButton, images.length >= MAX_IMAGES && styles.disabledButton]} 
            onPress={takePhoto}
            disabled={images.length >= MAX_IMAGES}
          >
            <Text style={styles.imageButtonText}>Camera</Text>
          </TouchableOpacity>
        </View>
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
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Share Location</Text>
        <TouchableOpacity 
          style={styles.locationToggle}
          onPress={() => setShareLocation(!shareLocation)}
        >
          <View style={[styles.toggle, shareLocation && styles.toggleActive]}>
            <View style={[styles.toggleThumb, shareLocation && styles.toggleThumbActive]} />
          </View>
          <Text style={styles.locationToggleText}>
            Help other bakers discover recipes from your area
          </Text>
        </TouchableOpacity>
        
        {shareLocation && (
          <View style={styles.locationInfo}>
            {locationLoading ? (
              <View style={styles.locationLoadingContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.locationLoadingText}>Getting your location...</Text>
              </View>
            ) : location ? (
              <View style={styles.locationDisplay}>
                <Text style={styles.locationIcon}>📍</Text>
                <View style={styles.locationTextContainer}>
                  <Text style={styles.locationText}>
                    {location.city && location.country 
                      ? `${location.city}, ${location.country}`
                      : 'Location detected'
                    }
                  </Text>
                  <TouchableOpacity onPress={getLocation}>
                    <Text style={styles.refreshLocationText}>Refresh location</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.getLocationButton} onPress={getLocation}>
                <Text style={styles.getLocationButtonText}>📍 Get Current Location</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      
      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.background} />
        ) : (
          <Text style={styles.submitButtonText}>Share Bread Post</Text>
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
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  errorText: {
    color: COLORS.error,
    marginBottom: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: BORDER_RADIUS.sm,
  },
  imageContainer: {
    marginBottom: SPACING.lg,
  },
  previewImage: {
    width: 150,
    height: 150,
    borderRadius: BORDER_RADIUS.md,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.lightGray,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    color: COLORS.darkGray,
    fontSize: FONT_SIZE.md,
  },
  imagePlaceholderSubtext: {
    color: COLORS.mediumGray,
    fontSize: FONT_SIZE.sm,
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  imageButton: {
    flex: 1,
    backgroundColor: COLORS.secondary,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    marginHorizontal: SPACING.xs,
    alignItems: 'center',
  },
  imageButtonText: {
    color: COLORS.background,
    fontWeight: 'bold',
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
  imageItem: {
    position: 'relative',
    marginRight: SPACING.sm,
    width: 150,
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: COLORS.background,
    fontSize: FONT_SIZE.sm,
    fontWeight: 'bold',
  },
  imagesList: {
    marginBottom: SPACING.sm,
    height: 150,
  },
  imageCountText: {
    color: COLORS.mediumGray,
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: COLORS.disabled,
  },
  locationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  toggle: {
    width: 40,
    height: 20,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.disabled,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.background,
    marginHorizontal: 2,
  },
  toggleThumbActive: {
    backgroundColor: COLORS.background,
  },
  locationToggleText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
    marginLeft: SPACING.sm,
  },
  locationInfo: {
    marginBottom: SPACING.lg,
  },
  locationLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  locationLoadingText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
  },
  locationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  locationIcon: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    marginRight: SPACING.sm,
  },
  locationTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
  },
  refreshLocationText: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.sm,
  },
  getLocationButton: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  getLocationButtonText: {
    color: COLORS.background,
    fontSize: FONT_SIZE.sm,
    fontWeight: 'bold',
  },
  connectedRecipeInfo: {
    marginBottom: SPACING.lg,
    padding: SPACING.sm,
    backgroundColor: COLORS.lightGray,
    borderRadius: BORDER_RADIUS.sm,
  },
  connectedRecipeText: {
    color: COLORS.text,
    fontSize: FONT_SIZE.sm,
  },
});

export default CreatePostScreen; 