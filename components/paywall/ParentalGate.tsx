import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  StyleSheet, 
  TextInput,
  Alert,
  Dimensions
} from 'react-native';
import { colors } from '@/constants/colors';
import { X, Shield, Lock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ParentalGateProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  purpose: 'purchase' | 'external_link';
  description: string;
}

interface MathQuestion {
  question: string;
  answer: number;
}

interface SequenceInstruction {
  instruction: string;
  sequence: string[];
  userSequence: string[];
}

export function ParentalGate({ visible, onSuccess, onCancel, purpose, description }: ParentalGateProps) {
  const [gateType, setGateType] = useState<'math' | 'sequence' | 'hold'>('math');
  const [mathQuestion, setMathQuestion] = useState<MathQuestion | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [sequenceTask, setSequenceTask] = useState<SequenceInstruction | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Screen dimensions for responsive design
  const { width } = Dimensions.get('window');

  // Initialize gate when modal becomes visible
  useEffect(() => {
    if (visible) {
      resetGate();
      generateRandomGate();
    } else {
      // Clean up when modal closes
      setUserAnswer('');
      setError(null);
      setAttempts(0);
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current);
        holdIntervalRef.current = null;
      }
      setHoldProgress(0);
      setIsHolding(false);
    }
  }, [visible]);

  const resetGate = () => {
    setUserAnswer('');
    setError(null);
    setAttempts(0);
    setSequenceTask(null);
    setMathQuestion(null);
  };

  const generateRandomGate = () => {
    const gateTypes: Array<'math' | 'sequence' | 'hold'> = ['math', 'sequence', 'hold'];
    const randomType = gateTypes[Math.floor(Math.random() * gateTypes.length)];
    setGateType(randomType);

    switch (randomType) {
      case 'math':
        generateMathQuestion();
        break;
      case 'sequence':
        generateSequenceTask();
        break;
      case 'hold':
        // Hold gate doesn't need generation
        break;
    }
  };

  const generateMathQuestion = () => {
    // Generate age-appropriate math problems that require adult comprehension
    const operations = [
      // Addition problems (medium difficulty)
      () => {
        const a = Math.floor(Math.random() * 25) + 15; // 15-39
        const b = Math.floor(Math.random() * 25) + 15; // 15-39
        return { question: `${a} + ${b}`, answer: a + b };
      },
      // Subtraction problems
      () => {
        const a = Math.floor(Math.random() * 30) + 40; // 40-69
        const b = Math.floor(Math.random() * 20) + 15; // 15-34
        return { question: `${a} - ${b}`, answer: a - b };
      },
      // Multiplication problems (single digit)
      () => {
        const a = Math.floor(Math.random() * 7) + 6; // 6-12
        const b = Math.floor(Math.random() * 7) + 6; // 6-12
        return { question: `${a} × ${b}`, answer: a * b };
      },
      // Division problems
      () => {
        const b = Math.floor(Math.random() * 8) + 3; // 3-10
        const answer = Math.floor(Math.random() * 12) + 5; // 5-16
        const a = b * answer;
        return { question: `${a} ÷ ${b}`, answer: answer };
      },
    ];

    const randomOperation = operations[Math.floor(Math.random() * operations.length)];
    setMathQuestion(randomOperation());
  };

  const generateSequenceTask = () => {
    const instructions = [
      {
        instruction: 'Tap the shapes in alphabetical order by their first letter:',
        sequence: ['Circle', 'Diamond', 'Square', 'Triangle'],
        userSequence: []
      },
      {
        instruction: 'Tap the colors in rainbow order:',
        sequence: ['Red', 'Orange', 'Yellow', 'Green'],
        userSequence: []
      },
      {
        instruction: 'Tap the numbers from smallest to largest:',
        sequence: ['23', '45', '67', '89'],
        userSequence: []
      }
    ];

    const randomInstruction = instructions[Math.floor(Math.random() * instructions.length)];
    // Shuffle the display order but keep the correct sequence
    const shuffled = [...randomInstruction.sequence].sort(() => Math.random() - 0.5);
    setSequenceTask({
      ...randomInstruction,
      sequence: shuffled
    });
  };

  const handleMathSubmit = () => {
    if (!mathQuestion) return;

    const userNum = parseInt(userAnswer);
    if (isNaN(userNum)) {
      setError('Please enter a valid number');
      return;
    }

    if (userNum === mathQuestion.answer) {
      onSuccess();
    } else {
      setAttempts(prev => prev + 1);
      if (attempts >= 2) {
        setError('Too many incorrect attempts. Please try again later.');
        setTimeout(() => onCancel(), 2000);
      } else {
        setError('Incorrect answer. Please try again.');
        setUserAnswer('');
        // Generate new question to prevent guessing
        generateMathQuestion();
      }
    }
  };

  const handleSequenceTap = (item: string) => {
    if (!sequenceTask) return;

    // Get the correct order based on the current instruction
    let correctOrder: string[] = [];
    const instruction = sequenceTask.instruction;
    
    if (instruction.includes('alphabetical')) {
      correctOrder = ['Circle', 'Diamond', 'Square', 'Triangle'];
    } else if (instruction.includes('rainbow')) {
      correctOrder = ['Red', 'Orange', 'Yellow', 'Green'];
    } else if (instruction.includes('smallest to largest')) {
      correctOrder = ['23', '45', '67', '89'];
    }

    const newUserSequence = [...sequenceTask.userSequence, item];
    
    // Check if this is the correct next item
    const expectedItem = correctOrder[newUserSequence.length - 1];
    if (item !== expectedItem) {
      setError('Incorrect sequence. Starting over.');
      setSequenceTask({
        ...sequenceTask,
        userSequence: []
      });
      return;
    }

    setSequenceTask({
      ...sequenceTask,
      userSequence: newUserSequence
    });

    if (newUserSequence.length === correctOrder.length) {
      onSuccess();
    }
  };

  const handleHoldStart = () => {
    setIsHolding(true);
    setHoldProgress(0);

    const interval = setInterval(() => {
      setHoldProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsHolding(false);
          onSuccess();
          return 100;
        }
        return prev + 2; // Takes 5 seconds (100 / 2 * 100ms)
      });
    }, 100);

    // Store interval to clear if user releases
    holdIntervalRef.current = interval as any;
  };

  const handleHoldEnd = () => {
    setIsHolding(false);
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setHoldProgress(0);
  };

  const renderMathGate = () => (
    <View style={styles.gateContent}>
      <Text style={styles.gateTitle}>Parent Verification Required</Text>
      <Text style={styles.gateDescription}>
        To continue with this purchase, please solve this math problem:
      </Text>
      
      {mathQuestion && (
        <View style={styles.mathContainer}>
          <Text style={styles.mathQuestion}>{mathQuestion.question} = ?</Text>
          <TextInput
            style={styles.mathInput}
            value={userAnswer}
            onChangeText={setUserAnswer}
            keyboardType="numeric"
            placeholder="Enter answer"
            placeholderTextColor={colors.textSecondary}
            autoFocus
          />
        </View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity style={styles.submitButton} onPress={handleMathSubmit}>
        <Text style={styles.submitButtonText}>Submit Answer</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSequenceGate = () => (
    <View style={styles.gateContent}>
      <Text style={styles.gateTitle}>Parent Verification Required</Text>
      <Text style={styles.gateDescription}>
        {sequenceTask?.instruction}
      </Text>
      
      <View style={styles.sequenceContainer}>
        {sequenceTask?.sequence.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.sequenceItem,
              sequenceTask.userSequence.includes(item) && styles.sequenceItemSelected
            ]}
            onPress={() => handleSequenceTap(item)}
          >
            <Text style={styles.sequenceItemText}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );

  const renderHoldGate = () => (
    <View style={styles.gateContent}>
      <Text style={styles.gateTitle}>Parent Verification Required</Text>
      <Text style={styles.gateDescription}>
        Hold the button below for 5 seconds to continue with this purchase.
        This action is intended for parents only.
      </Text>
      
      <TouchableOpacity
        style={[styles.holdButton, isHolding && styles.holdButtonActive]}
        onPressIn={handleHoldStart}
        onPressOut={handleHoldEnd}
        activeOpacity={0.8}
      >
        <View style={styles.holdButtonContent}>
          <View style={[styles.holdProgress, { width: `${holdProgress}%` }]} />
          <Text style={styles.holdButtonText}>
            {isHolding ? `Hold (${Math.ceil((100 - holdProgress) / 20)}s)` : 'Hold for 5 seconds'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderGateContent = () => {
    switch (gateType) {
      case 'math':
        return renderMathGate();
      case 'sequence':
        return renderSequenceGate();
      case 'hold':
        return renderHoldGate();
      default:
        return renderMathGate();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
              <X size={20} color={colors.white} />
            </TouchableOpacity>
            
            <Shield size={40} color={colors.warning} />
            <Text style={styles.headerTitle}>Parental Gate</Text>
            <Text style={styles.headerSubtitle}>
              This feature requires parental permission
            </Text>
          </View>

          {/* Purpose Description */}
          <View style={styles.purposeSection}>
            <Text style={styles.purposeText}>{description}</Text>
          </View>

          {/* Gate Content */}
          {renderGateContent()}

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: colors.card,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardLight,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Nunito-ExtraBold',
    fontSize: 20,
    color: colors.white,
    marginTop: 12,
  },
  headerSubtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  purposeSection: {
    padding: 20,
    paddingBottom: 16,
  },
  purposeText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    color: colors.white,
    textAlign: 'center',
    lineHeight: 22,
  },
  gateContent: {
    padding: 20,
    paddingTop: 0,
  },
  gateTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    color: colors.white,
    marginBottom: 12,
    textAlign: 'center',
  },
  gateDescription: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  // Math Gate Styles
  mathContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  mathQuestion: {
    fontFamily: 'Nunito-Bold',
    fontSize: 24,
    color: colors.white,
    marginBottom: 16,
  },
  mathInput: {
    backgroundColor: colors.cardLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    color: colors.white,
    textAlign: 'center',
    minWidth: 120,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: colors.white,
  },
  // Sequence Gate Styles
  sequenceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  sequenceItem: {
    backgroundColor: colors.cardLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 6,
    borderWidth: 2,
    borderColor: colors.cardLight,
  },
  sequenceItemSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sequenceItemText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: colors.white,
  },
  // Hold Gate Styles
  holdButton: {
    backgroundColor: colors.cardLight,
    borderRadius: 12,
    height: 60,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.cardLight,
  },
  holdButtonActive: {
    borderColor: colors.primary,
  },
  holdButtonContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  holdProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    opacity: 0.3,
  },
  holdButtonText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: colors.white,
    zIndex: 1,
  },
  // Common Styles
  errorText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  footer: {
    padding: 20,
    paddingTop: 0,
  },
  cancelButton: {
    backgroundColor: colors.cardLight,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    color: colors.textSecondary,
  },
}); 